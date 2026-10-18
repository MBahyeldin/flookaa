package onboarding

import (
	"context"
	"errors"
	"fmt"
)

type Step struct {
	ID        int32
	Key       string
	Skippable bool
	Done      func(ctx context.Context, userID int64) (bool, error)
}

type Action string

const (
	ActionNext Action = "next"
	ActionSkip Action = "skip"
	ActionBack Action = "back"
)

var (
	ErrCompleted      = errors.New("onboarding_completed")
	ErrStepMismatch   = errors.New("step_mismatch")
	ErrStepIncomplete = errors.New("step_incomplete")
	ErrStepRequired   = errors.New("step_required")
	ErrNoPreviousStep = errors.New("no_previous_step")
	ErrInvalidAction  = errors.New("invalid_action")
)

type StepInfo struct {
	Key       string `json:"key"`
	Skippable bool   `json:"skippable"`
}

type State struct {
	Completed bool       `json:"completed"`
	Current   *string    `json:"current"`
	Steps     []StepInfo `json:"steps"`
}

// Flow is the ordered list of registered steps. users.onboarding_step holds the
// id of the last step passed; the current step is the first with a larger id.
type Flow struct {
	steps []Step
}

func New(steps ...Step) (*Flow, error) {
	var prev int32
	for _, s := range steps {
		if s.ID <= prev {
			return nil, fmt.Errorf("onboarding: step %q id %d must be greater than %d", s.Key, s.ID, prev)
		}
		if s.Done == nil {
			return nil, fmt.Errorf("onboarding: step %q has no Done check", s.Key)
		}
		prev = s.ID
	}
	return &Flow{steps: steps}, nil
}

// Past every step, required steps whose Done is false are caught up on, alone.
type position struct {
	index   int
	catchUp []int
}

func (f *Flow) position(ctx context.Context, userID int64, lastStep int32, completed bool) (position, error) {
	if !completed {
		for i, s := range f.steps {
			if s.ID > lastStep {
				return position{index: i}, nil
			}
		}
	}
	var missing []int
	for i, s := range f.steps {
		if s.Skippable {
			continue
		}
		done, err := s.Done(ctx, userID)
		if err != nil {
			return position{index: -1}, err
		}
		if !done {
			missing = append(missing, i)
		}
	}
	if len(missing) == 0 {
		return position{index: -1}, nil
	}
	return position{index: missing[0], catchUp: missing}, nil
}

func (f *Flow) info(i int) StepInfo {
	return StepInfo{Key: f.steps[i].Key, Skippable: f.steps[i].Skippable}
}

// On a Done error the state leaves catch-up out, so callers can fail open.
func (f *Flow) State(ctx context.Context, userID int64, lastStep int32, completed bool) (State, error) {
	pos, err := f.position(ctx, userID, lastStep, completed)
	var st State
	if pos.catchUp != nil {
		st.Steps = make([]StepInfo, len(pos.catchUp))
		for j, i := range pos.catchUp {
			st.Steps[j] = f.info(i)
		}
	} else {
		st.Steps = make([]StepInfo, len(f.steps))
		for i := range f.steps {
			st.Steps[i] = f.info(i)
		}
	}
	if pos.index < 0 {
		st.Completed = true
		return st, err
	}
	st.Current = &f.steps[pos.index].Key
	return st, err
}

// Write is false for a catch-up step: it doesn't move the stored position.
type Result struct {
	Step      int32
	Completed bool
	Write     bool
}

// Move validates an action on the current step and returns the new
// onboarding_step and onboarding_completed values.
func (f *Flow) Move(ctx context.Context, userID int64, lastStep int32, completed bool, key string, action Action) (Result, error) {
	pos, err := f.position(ctx, userID, lastStep, completed)
	if err != nil {
		return Result{}, err
	}
	i := pos.index
	if i < 0 {
		return Result{}, ErrCompleted
	}
	step := f.steps[i]
	if step.Key != key {
		return Result{}, ErrStepMismatch
	}

	if pos.catchUp != nil {
		switch action {
		case ActionNext:
			done, err := step.Done(ctx, userID)
			if err != nil {
				return Result{}, err
			}
			if !done {
				return Result{}, ErrStepIncomplete
			}
			return Result{Step: lastStep, Completed: completed}, nil
		case ActionSkip:
			return Result{}, ErrStepRequired
		case ActionBack:
			return Result{}, ErrNoPreviousStep
		}
		return Result{}, ErrInvalidAction
	}

	last := i == len(f.steps)-1
	switch action {
	case ActionNext:
		done, err := step.Done(ctx, userID)
		if err != nil {
			return Result{}, err
		}
		if !done {
			return Result{}, ErrStepIncomplete
		}
		return Result{Step: step.ID, Completed: last, Write: true}, nil
	case ActionSkip:
		if !step.Skippable {
			return Result{}, ErrStepRequired
		}
		return Result{Step: step.ID, Completed: last, Write: true}, nil
	case ActionBack:
		if i == 0 {
			return Result{}, ErrNoPreviousStep
		}
		if i == 1 {
			return Result{Write: true}, nil
		}
		return Result{Step: f.steps[i-2].ID, Write: true}, nil
	}
	return Result{}, ErrInvalidAction
}
