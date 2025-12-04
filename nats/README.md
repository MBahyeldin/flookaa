
To build for a different target architecture, you may need to install the appropriate Rust target. For example, to build for `aarch64-unknown-linux-gnu`, run:
```
brew tap messense/macos-cross-toolchains
```

```
brew install aarch64-unknown-linux-gnu
```

```
rustup target add aarch64-unknown-linux-gnu
```

