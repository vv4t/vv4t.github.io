import sys
import urllib.parse
import re

if len(sys.argv) != 3:
  print("usage: build [html] [shell]")
  sys.exit(1)

html_file = open(sys.argv[1], "r")
shell_file = open(sys.argv[2], "r")

html_content = html_file.read()
shell_content = shell_file.read()

str_title = html_content.split("\n")[0]
title = re.match("<h1 id=\"[a-z-0-9]+\">(.+)<\/h1>", str_title).group(1)

output_html = shell_content.replace("{{{POST}}}", html_content).replace("{{{TITLE}}}", title)
output_html = urllib.parse.unquote_plus(output_html)

html_file.close()
shell_file.close()

output_file = open(sys.argv[1], "w")
output_file.write(output_html)
