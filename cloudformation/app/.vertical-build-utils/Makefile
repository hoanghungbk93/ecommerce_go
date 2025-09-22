ROOT_DIR := $(shell dirname $(abspath $(lastword $(MAKEFILE_LIST))))
SCRIPTS_DIR=$(realpath $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/../../../scripts)

# hacky unsafe variable. should only be used in targets used to deploy vertical
# stacks.
VERTICAL_NAME=$(firstword $(subst /, ,$(firstword $(MAKECMDGOALS))))
include verticals/$(VERTICAL_NAME)/Makefile.vars

STACKS:=$(shell (find -L . -regex '^.*verticals/.+/template.yml' | awk -F '/' '{printf "%s/%s\n",$$3,$$4}'))

.PHONY: $(STACKS)
$(STACKS):
	@set -eo pipefail ; \
	VERTICAL_NAME_FROM_TAG=$$(jq  '.[] | select(.Key=="Vertical") | .Value' -r < "${ROOT_DIR}/verticals/$@/tags.json") ; \
	HAS_ENV_JSON="$$(find -L ./verticals/$@ -regex '.*/\(dev\|qa\|prod\).json')" ; \
	$(MAKE) check-vertical-name VERTICAL_NAME="$(VERTICAL_NAME)" CHECK_VERTICAL_NAME="$$VERTICAL_NAME_FROM_TAG" ; \
	set +x ; \
	STACK_DIR="$(lastword $(subst /, ,$(lastword $@)))" ; \
	if [ -n "$$HAS_ENV_JSON" ]; then \
		$(MAKE) check-env ; \
		export STACK_NAME="$$(printf '%s-%s-%s' ${ENV} ${VERTICAL_NAME} $${STACK_DIR})" ; \
		export VERTICAL_NAME="$(VERTICAL_NAME)" ; \
		echo "Deploying env template: $$STACK_NAME..." ; \
		SCRIPT_NAME=deploy-env-template.sh ; \
		SCRIPT_ARGS=${ENV} ; \
	else \
		export STACK_NAME="$$(printf '%s-%s' $(VERTICAL_NAME) "$${STACK_DIR}")" ; \
		if [ -n "$(findstring $(lastword $(subst /, ,$(lastword $@))),$(LITERAL_STACKS))" ] ; then \
			echo "using literal stack" ; \
			export STACK_NAME="$${STACK_DIR}" ; \
		fi ; \
		echo "Deploying global template: $$STACK_NAME..." ; \
		SCRIPT_NAME=deploy-global-template.sh ; \
	fi ; \
	sh "${SCRIPTS_DIR}/$$SCRIPT_NAME" "${ROOT_DIR}/verticals/${VERTICAL_NAME}/$$STACK_DIR/template.yml" $$SCRIPT_ARGS

lint: cfn-lint
cfn-lint:
	set -eo pipefail ; \
		find -L ./ -type f -name template.yml | \
		while read FILE; do echo "$$FILE" ; \
			sleep 0.5 ; aws cloudformation validate-template --template-body "$$(cat "$$FILE")" >/dev/null ; \
		done
	set -eo pipefail ; \
		find -L ./ -maxdepth 2 -type f -name '*.json' |\
		while read FILE; do echo "$$FILE" ; jsonlint "$$FILE" >/dev/null ; done

check-env: check-account-id
ifndef ENV
	$(error ENV is undefined. run `make ENV=<name> <target>`)
else
	@echo $@: OK
endif

check-account-id:
ifdef AWS_ACCOUNT_ID
	@echo $@: checking AWS account ID...
ifneq ($(word 1, $(shell aws sts get-caller-identity --output text)),$(strip $(AWS_ACCOUNT_ID)))
	$(error Invalid AWS settings. Please run this against the AWS account with the ID $(AWS_ACCOUNT_ID))
endif
endif

check-vertical-name:
ifneq ($(CHECK_VERTICAL_NAME),)
ifneq ($(CHECK_VERTICAL_NAME),$(VERTICAL_NAME))
	$(error detected multiple names for this vertical. (${CHECK_VERTICAL_NAME} and ${VERTICAL_NAME}))
else
	@echo $@: OK
endif
else
	@echo $@: no vertical tag found. skipping check
endif
