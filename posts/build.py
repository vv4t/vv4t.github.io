import sys

if len(sys.argv) != 3:
  print("usage: build [html] [shell]")
  sys.exit(1)

html_file = open(sys.argv[1], "r")
shell_file = open(sys.argv[2], "r")
md_file = open(sys.argv[1].replace("html", "md"), "r")

html_content = html_file.read()
shell_content = shell_file.read()
md_content = md_file.read()

title = md_content.split("\n")[0].replace("# ", "")

output_html = shell_content.replace("{{{POST}}}", html_content).replace("{{{TITLE}}}", title)

md_file.close()
html_file.close()
shell_file.close()

output_file = open(sys.argv[1], "w")
output_file.write(output_html)
