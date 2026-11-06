#!/bin/sh
# One-time setup of a Debian 13 host for developers.quip.network. Run as root from a checkout:
#   sh deploy/host/setup.sh
# The registry login and starting the units are separate steps, in deploy/README.md.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends podman passt uidmap fail2ban python3-systemd \
  unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https curl gnupg ca-certificates

# Caddy from its own repository: Debian's package is several releases behind.
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt >/etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Security updates nightly, with a reboot when one needs it. Linger brings the sites back.
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
cat >/etc/apt/apt.conf.d/52portal-reboot <<'CONF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
CONF

# Go servers, Caddy included, open MPTCP listeners by default. Nothing here needs MPTCP.
printf 'net.mptcp.enabled = 0\n' >/etc/sysctl.d/90-no-mptcp.conf
sysctl -q -p /etc/sysctl.d/90-no-mptcp.conf || echo "sysctl not applied now; it applies at boot"

# Debian's sshd logs only to the journal, as ssh.service, which upstream's filter does not match.
cat >/etc/fail2ban/jail.d/sshd.local <<'CONF'
[sshd]
enabled = true
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service
maxretry = 5
findtime = 10m
bantime = 1h
bantime.increment = true
CONF
systemctl restart fail2ban

# The sites run rootless as portal. Linger starts its units at boot with nobody logged in.
id portal >/dev/null 2>&1 || useradd -m -s /bin/bash portal
loginctl enable-linger portal
install -m 0755 "$here/portal-pin" /usr/local/bin/portal-pin
# The site units are installed after the registry login, or they start and fail without it.
install -d /usr/local/share/portal
install -m 0644 "$here/portal-staging.container" "$here/portal-production.container" /usr/local/share/portal/
home=$(getent passwd portal | cut -d: -f6)
install -d -o portal -g portal "$home/.config" "$home/.config/containers" "$home/.config/containers/systemd" \
  "$home/.config/systemd" "$home/.config/systemd/user" "$home/.config/systemd/user/podman-auto-update.timer.d"
install -m 0644 -o portal -g portal "$here/podman-auto-update.timer.d/every-5-min.conf" "$home/.config/systemd/user/podman-auto-update.timer.d/"
install -m 0644 -o portal -g portal "$here/portal-prune.service" "$here/portal-prune.timer" "$home/.config/systemd/user/"

install -m 0644 "$here/Caddyfile" /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy

echo "Done. Next, as portal: the registry login, then start the units (deploy/README.md, Host)."
