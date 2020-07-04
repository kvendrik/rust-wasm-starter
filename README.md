# Rust WebAssembly Starter

🏃‍♂️ Get started with Rust and WebAssembly in seconds

## Quick Start

```bash
git clone git@github.com:kvendrik/rust-wasm-starter.git
cd rust-wasm-starter
yarn setup
yarn server
```

- Edit the Rust files in `./src`
- Edit the HTML and JS in `./static/index.html`.

## Quick Start (One line)

Or in one line, make sure to change `your-project-name` before running:

```bash
(RWPJ_NAME="your-project-name" && git clone git@github.com:kvendrik/rust-wasm-starter.git $RWPJ_NAME && cd $RWPJ_NAME && yarn setup && yarn server)
```

## What it does

- Will listen on port `8080` and automatically open the page when you start the server
- Automatically recompiles when source files change
- Automatically reloads the page for you

## Customizing your dev experience

- `PORT=3000 yarn server` allows you to start on a different port
- `server.mjs` manages the dev experience and is fully customizable. At the top of the file you'll find options for toggling live reload and file watching on/off.
- The `build` command can be found in `package.json` and is used to compile the source files. If you update the name of the output directory make sure to also update this name in `server.mjs`.
