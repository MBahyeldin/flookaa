install migration driver:
```go install -tags "postgres" github.com/golang-migrate/migrate/v4/cmd/migrate@latest```

install migration tool:
```go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest```


install gqlgen:
```go install github.com/99designs/gqlgen@latest```


put go in your PATH:
this is useful if you installed go tools using `go install ...`
export PATH=$PATH:$(go env GOPATH)/bin