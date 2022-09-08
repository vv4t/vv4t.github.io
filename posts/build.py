import sys

if len(sys.argv) != 3:
  print("usage: build [html] [shell]")
  sys.exit(1)

html_file = open(sys.argv[1], "r")
shell_file = open(sys.argv[2], "r")

output_html = shell_file.read().replace("{{{POST}}}", html_file.read())

html_file.close()
shell_file.close()

output_file = open(sys.argv[1], "w")
output_file.write(output_html)
