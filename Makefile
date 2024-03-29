.PHONY: all
all: build

.PHONY: dev
dev:
ifneq ("$(wildcard ./dev/.pids)", "")
	@echo "Dev environment already running, run \`$(MAKE) dev_stop\` first if you need to rebuild"
else
ifeq ("$(wildcard ./dev)", "")
	mkdir dev
endif
	npm install --no-fund
# Direct invocation of these scripts instead of doing it through npm or npx is necessary for redirection
# Otherwise npm just forks these processes and there's no way to redirect their output to log files
	./node_modules/.bin/webpack --watch > dev/build.log 2> dev/build.log & echo $$! >> dev/.pids
	./node_modules/.bin/http-server > dev/server.log 2> dev/server.log & echo $$! >> dev/.pids
	@echo
	@echo "Running live at \e[0;32mhttp://localhost:8080\e[0m with hot reloads"
endif

.PHONY: dev_stop
dev_stop:
	kill -9 `cat dev/.pids`
	rm dev/.pids

.PHONY: build
build:
	npm install --no-fund
	npx webpack
	chmod -R a+rX dist catalogs.json index.html stylesheet.css

.PHONY: update
update: clean
	npm upgrade
	$(MAKE) build

.PHONY: clean
clean:
# This is not explicitly a target dependency as this failing just means no dev environment was running
	-$(MAKE) dev_stop
	-rm -rf dist node_modules dev
