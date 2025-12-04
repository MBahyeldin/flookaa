### Recommended Folder Structure from Bing Copilot

Organizing your folder structure for an Ansible project is crucial for
maintaining clarity and efficiency. Here's a recommended structure:


```sh
ansible_project/
├── inventory/
│   ├── production.yml
│   └── staging.yml
├── group_vars/
│   ├── all.yml
│   ├── production.yml
│   └── staging.yml
├── host_vars/
│   ├── host1.yml
│   └── host2.yml
├── roles/
│   ├── role1/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   ├── files/
│   │   ├── vars/
│   │   │   └── main.yml
│   │   ├── defaults/
│   │   │   └── main.yml
│   │   ├── meta/
│   │   │   └── main.yml
│   │   ├── tests/
│   │   │   ├── inventory
│   │   │   └── test.yml
│   └── role2/
│       ├── tasks/
│       ├── handlers/
│       ├── templates/
│       ├── files/
│       ├── vars/
│       ├── defaults/
│       ├── meta/
│       └── tests/
├── templates/
│   └── template.j2
├── files/
│   └── file.txt
├── vars/
│   └── vault.yml
└── ansible.cfg
├── site.playbook.yml
├── webservers.playbook.yml
└── dbservers.playbook.yml
```

### Explanation

- **inventory/**: Contains inventory files for different environments (e.g., `production.yml`, `staging.yml`).
- **group_vars/**: Stores variables that apply to groups of hosts (e.g., `all.yml`, `production.yml`, `staging.yml`).
- **host_vars/**: Stores variables specific to individual hosts (e.g., `host1.yml`, `host2.yml`).
- **roles/**: Contains roles, each with its own set of tasks, handlers, templates, files, variables, defaults, meta information, and tests.
- **templates/**: Stores Jinja2 template files.
- **files/**: Stores files to be copied to remote hosts.
- **vars/**: Contains variable files, including encrypted variables using Ansible Vault (e.g., `vault.yml`).
- **ansible.cfg**: Configuration file for Ansible settings.

### How to Use

1. **Define your inventory** files for different environments.
2. **Create roles** for reusable sets of tasks and organize them within the `roles/` directory.
3. **Write playbooks** to orchestrate tasks across hosts and groups.
4. **Store templates** and files in their respective directories.
5. **Use group_vars and host_vars** to manage variables for groups and individual hosts.
6. **Encrypt sensitive variables** using Ansible Vault and store them in the `vars/` directory.

This structure helps keep your project organized and scalable. If you have any questions or need further assistance, feel free to ask!

## Install valut on MacOS

https://pipx.pypa.io/stable/
```bash
brew install pipx
pipx ensurepath
pipx install --include-deps ansible ansible-lint
```

## To create a new secret file.

Change path to vault and keep it in sync e.g. vars/torque_vault.yml and vars/torque.yml, read
https://docs.ansible.com/ansible/latest/tips_tricks/ansible_tips_tricks.html#keep-vaulted-variables-safely-visible

```bash
ansible-vault edit vars/torque_vault.yml --vault-password-file ./internal-scripts/vault-pass.bash
ansible-vault create vars/torque_vault.yml --vault-password-file ./internal-scripts/vault-pass.bash
```