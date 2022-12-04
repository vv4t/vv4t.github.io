.PHONY=default

PUBLIC_POSTS=$(wildcard public/*.md)
PUBLIC_PAGES=$(patsubst public/%.md, public_%.html, $(PUBLIC_POSTS))

PRIVATE_POSTS=$(wildcard private/*.md)
UNPRIVATE_PAGES=$(patsubst private/%.md, private/%.html, $(PRIVATE_POSTS))
PRIVATE_PAGES=$(patsubst private/%.md, private_%.html, $(PRIVATE_POSTS))

default: $(PRIVATE_PAGES) $(PUBLIC_PAGES)

private_%.html: private/%.html login.html
	sscrpted $< login.html highlysecurepassword123 $@

private/%.html: private/%.md shell.html
	lowdown -thtml $< -o $@
	python build.py $@ shell.html

public_%.html: public/%.md shell.html
	lowdown -thtml $< -o $@
	python build.py $@ shell.html
