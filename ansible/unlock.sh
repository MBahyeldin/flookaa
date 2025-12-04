#!/bin/bash

echo "This script is used to decrypt a GPG-encrypted vault password file for Ansible."
echo "This should add them to the agents so you don't have to enter them again."

export GPG_TTY=$(tty)
./internal-scripts/vault-pass.bash > /dev/null
./internal-scripts/vault-pass.bash > /dev/null
ssh ptc-ssg-be-ansible "cat ~/im-in.txt"
ssh ptc-ssg-be-ansible "echo"