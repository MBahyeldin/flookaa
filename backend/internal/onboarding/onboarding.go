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

func (f *Flow) current(lastStep int32, completed bool) int {
	if completed {
		return -1
	}
	for i, s := range f.steps {
		if s.ID > lastStep {
			return i
		}
	}
	return -1
}

func (f *Flow) State(lastStep int32, completed bool) State {
	st := State{Steps: make([]StepInfo, len(f.steps))}
	for i, s := range f.steps {
		st.Steps[i] = StepInfo{Key: s.Key, Skippable: s.Skippable}
	}
	i := f.current(lastStep, completed)
	if i < 0 {
		st.Completed = true
		return st
	}
	st.Current = &f.steps[i].Key
	return st
}

// Move validates an action on the current step and returns the new
// onboarding_step and onboarding_completed values.
func (f *Flow) Move(ctx context.Context, userID int64, lastStep int32, completed bool, key string, action Action) (int32, bool, error) {
	i := f.current(lastStep, completed)
	if i < 0 {
		return 0, false, ErrCompleted
	}
	step := f.steps[i]
	if step.Key != key {
		return 0, false, ErrStepMismatch
	}
	last := i == len(f.steps)-1

	switch action {
	case ActionNext:
		done, err := step.Done(ctx, userID)
		if err != nil {
			return 0, false, err
		}
		if !done {
			return 0, false, ErrStepIncomplete
		}
		return step.ID, last, nil
	case ActionSkip:
		if !step.Skippable {
			return 0, false, ErrStepRequired
		}
		return step.ID, last, nil
	case ActionBack:
		if i == 0 {
			return 0, false, ErrNoPreviousStep
		}
		if i == 1 {
			return 0, false, nil
		}
		return f.steps[i-2].ID, false, nil
	}
	return 0, false, ErrInvalidAction
}
