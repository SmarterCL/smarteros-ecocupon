---
name: 🚨 Health Alert
description: Automated health check failure alert
labels: [agent, health, critical, auto]
---

## 🔴 Service Health Check Failed

**Detected by:** GitHub Actions Agent  
**Run ID:** ${{ github.run_id }}  
**Time:** $(date -u '+%Y-%m-%d %H:%M UTC')

---

### Affected Services

| Service | Status | Last Check |
|---------|--------|------------|
| EcoCupon | ❌ DOWN | Just now |
| QR Gateway | ❌ DOWN | Just now |
| EcoCanasta | ❌ DOWN | Just now |

---

### Automatic Actions Taken

- [x] Health check failed
- [x] Issue created automatically
- [ ] Agent investigating
- [ ] Service restarted
- [ ] Verified healthy

---

### Recovery Steps

1. Agent will attempt auto-restart
2. If restart fails, human intervention required
3. Check VPS: `ssh root@89.116.23.167`
4. Check logs: `docker logs <container>`

---

**⚠️ This issue was created automatically by GitHub Actions**
