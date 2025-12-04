#!/bin/bash

# !!!!!! DO NOT RUN THIS SCRIPT DIRECTLY !!!!!!!!

export GPG_TTY=$(tty)

# This script is used to decrypt a GPG-encrypted vault password file for Ansible.
echo "
-----BEGIN PGP MESSAGE-----

jA0ECQMILVZPgsj8htr/0sBWAXxiaRhKsL9Vq7BACnr0uSTG746qjLYujGQ4KKBf
kB8c/mn8Nr9akUkPn4aIgUSIchYvzhq1h8sJC0rj4jwAw7kcj9EsCwrZyqwGYBWa
9QnEzXAP1aOoFko10kcVFKinnx2CcoqInpmPxwSaqlqYCY55pcWw0Uxkb2md76AY
yJ3M5L2f70ZCbXgnS9oNXLZQOTFVJ7UR1ZtgtoBCi8aztC6EalcP+F0WMV3uu3MV
leg12uLCBdLaxqDasQuTqLuzdbEzq2jqMGtfrRgmSdfkVsX+HgjzOMcqD7EGO+kB
9VSrh4FE09lFayh5cx7KOXBM0TICT1AmllDBWFPjqcHno5beDehhjVQWsI1dgLMV
iBLZEJUe+FM=
=ZMg3
-----END PGP MESSAGE-----
" | gpg --decrypt 2> /dev/null

# !!!!!! DO NOT RUN THIS SCRIPT DIRECTLY !!!!!!!!