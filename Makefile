NAME := $(shell node -p "require('./package.json').name")
VERSION := $(shell node -p "require('./package.json').version")
VSIX := $(NAME)-$(VERSION).vsix

.PHONY: generate install

package:
	pnpm run package

install:
	code --install-extension $(VSIX) --force
