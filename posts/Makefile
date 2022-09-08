
POSTS=$(wildcard *.md)
PAGES=$(patsubst %.md, %.html, $(POSTS))

default: $(PAGES)

%.html: %.md shell.html
	lowdown -thtml $< -o $@
	python build.py $@ shell.html
