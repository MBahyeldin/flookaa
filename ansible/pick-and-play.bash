#!/bin/bash

# Define the commands
commands=(
  "ansible-playbook   hosting-machine.playbook.yml      -i inventory/hosting-machine.inventory.yml                             --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   redis.playbook.yml                -i inventory/redis.inventory.yml           -e @vars/redis_vault.yml    --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   app.playbook.yml                  -i inventory/app.inventory.yml             -e @vars/app_vault.yml      --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   postgres.playbook.yml             -i inventory/postgres.inventory.yml        -e @vars/postgres_vault.yml --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   s3.playbook.yml                   -i inventory/s3.inventory.yml              -e @vars/s3_vault.yml       --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   nats.playbook.yml                 -i inventory/nats.inventory.yml                                        --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   grafana.playbook.yml              -i inventory/grafana.inventory.yml         -e @vars/grafana_vault.yml  --vault-password-file ./internal-scripts/vault-pass.bash"
  "ansible-playbook   neo4j.playbook.yml                -i inventory/neo4j.inventory.yml           -e @vars/neo4j_vault.yml    --vault-password-file ./internal-scripts/vault-pass.bash"
 )

# Display the menu
echo "Please choose a command to run:"
for i in "${!commands[@]}"; do
  padded_i=$(printf "%03d" $((i + 1)))
  echo "$padded_i. ${commands[$i]}" | cut -d' ' -f1,3- | sed 's/--vault-password-file .*/.../g'
done

# Read user input
read -p "Enter a number (1-${#commands[@]}): " choice

# print the choosen command and make it bright yellow
echo -e "You chose: \n\n\033[1;33m${commands[$((choice - 1))]}\033[0m \n"

read -p "Save to ndjson? (y/n): " log_choice

# Validate user input
if [[ "$choice" -ge 1 && "$choice" -le ${#commands[@]} ]]; then
  # Get the current timestamp in a human-readable format
  timestamp="$(date +"%Y-%m-%d_%H-%M-%S")"

  git_commit=$(git rev-parse --short=8 HEAD 2>/dev/null)
  if [ $? -ne 0 ]; then
    git_commit="no_git"
  fi

  # Join all arguments into a single string, replacing spaces with __ and / with _-_
  selected_command="${commands[$((choice - 1))]}"
  filename_command=$(echo "$selected_command" | tr ' ' '__' | tr '/' '_-_')

  # Run the selected command and pipe the output to tee
  if [ "$log_choice" != "y" ]; then
    echo "Prining to stdout"
    selected_command="${selected_command}"
    echo "Running command without ndjson logs: $selected_command"
    export ANSIBLE_STDOUT_CALLBACK="default"
    eval "$selected_command"
  else
    projection=$(echo -n "{..., \"_dateAdded\": \"${timestamp}\", \"_command\": \"${selected_command}\", \"_commit\": \"${git_commit}\"}")
    echo "Projection: $projection"
    echo "Running command: $selected_command"
    eval "$selected_command" | \
      groq -i ndjson -o ndjson "*[1 == 1]${projection}" | \
      tee "./runs/logs/pick-and-play.ndjson" -a | \
      tail -n 1 | \
      groq -i ndjson -p "*[1 == 1]${projection}"
  fi
else
  echo "Invalid choice. Please enter a number between 1 and ${#commands[@]}."
fi