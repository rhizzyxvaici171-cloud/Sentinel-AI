"""
log_parser.py
Parses common log formats (SSH auth logs, generic CSV access logs) into
a normalized list of events that the rest of the system can reason about.
"""

import re
import csv
import io
from datetime import datetime
from collections import defaultdict, Counter


SSH_FAILED_RE = re.compile(
    r"(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2}).*"
    r"Failed password for (invalid user )?(?P<user>\S+) from (?P<ip>[\d.]+)"
)
SSH_ACCEPTED_RE = re.compile(
    r"(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2}).*"
    r"Accepted password for (?P<user>\S+) from (?P<ip>[\d.]+)"
)
SSH_INVALID_USER_RE = re.compile(
    r"(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2}).*"
    r"Invalid user (?P<user>\S+) from (?P<ip>[\d.]+)"
)


def _parse_syslog_timestamp(month, day, time_str, year=None):
    year = year or datetime.now().year
    try:
        dt = datetime.strptime(f"{year} {month} {day} {time_str}", "%Y %b %d %H:%M:%S")
        return dt.isoformat()
    except ValueError:
        return None


def parse_auth_log(text: str):
    """Parse SSH-style auth.log text into normalized events."""
    events = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        m = SSH_FAILED_RE.search(line)
        if m:
            events.append({
                "timestamp": _parse_syslog_timestamp(m.group("month"), m.group("day"), m.group("time")),
                "event_type": "auth_failure",
                "user": m.group("user"),
                "source_ip": m.group("ip"),
                "raw": line,
            })
            continue

        m = SSH_ACCEPTED_RE.search(line)
        if m:
            events.append({
                "timestamp": _parse_syslog_timestamp(m.group("month"), m.group("day"), m.group("time")),
                "event_type": "auth_success",
                "user": m.group("user"),
                "source_ip": m.group("ip"),
                "raw": line,
            })
            continue

        m = SSH_INVALID_USER_RE.search(line)
        if m:
            events.append({
                "timestamp": _parse_syslog_timestamp(m.group("month"), m.group("day"), m.group("time")),
                "event_type": "invalid_user",
                "user": m.group("user"),
                "source_ip": m.group("ip"),
                "raw": line,
            })
            continue

    return events


def parse_csv_log(text: str):
    """
    Parse a generic CSV access log. Expected (flexible) columns:
    timestamp, source_ip, user, event_type
    Extra columns are preserved but ignored for analysis.
    """
    events = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        normalized = {k.strip().lower(): v.strip() if v else v for k, v in row.items()}
        events.append({
            "timestamp": normalized.get("timestamp") or normalized.get("time"),
            "event_type": normalized.get("event_type") or normalized.get("status") or "unknown",
            "user": normalized.get("user") or normalized.get("username"),
            "source_ip": normalized.get("source_ip") or normalized.get("ip"),
            "raw": ",".join(row.values()),
        })
    return events


def parse_log_file(filename: str, text: str):
    """Dispatch to the right parser based on file extension / content sniffing."""
    if filename.lower().endswith(".csv"):
        events = parse_csv_log(text)
    else:
        events = parse_auth_log(text)
        if not events:
            # fall back to CSV parsing in case extension was misleading
            events = parse_csv_log(text)
    return events


def summarize_events(events):
    """
    Build a compact statistical summary of events, safe to hand to an LLM
    without exceeding context or leaking the full raw log.
    """
    total = len(events)
    by_type = Counter(e["event_type"] for e in events)

    failed_by_ip = defaultdict(int)
    failed_by_user = defaultdict(int)
    ips_seen = set()
    users_seen = set()

    for e in events:
        if e.get("source_ip"):
            ips_seen.add(e["source_ip"])
        if e.get("user"):
            users_seen.add(e["user"])
        if e["event_type"] in ("auth_failure", "invalid_user"):
            if e.get("source_ip"):
                failed_by_ip[e["source_ip"]] += 1
            if e.get("user"):
                failed_by_user[e["user"]] += 1

    top_failed_ips = sorted(failed_by_ip.items(), key=lambda x: -x[1])[:10]
    top_failed_users = sorted(failed_by_user.items(), key=lambda x: -x[1])[:10]

    # simple burst detection: >=5 failures from same IP
    brute_force_candidates = [ip for ip, count in failed_by_ip.items() if count >= 5]

    return {
        "total_events": total,
        "event_counts": dict(by_type),
        "unique_ips": len(ips_seen),
        "unique_users": len(users_seen),
        "top_failed_ips": top_failed_ips,
        "top_failed_users": top_failed_users,
        "brute_force_candidates": brute_force_candidates,
    }


def build_timeline(events, bucket="hour"):
    """Bucket events by hour for charting."""
    buckets = defaultdict(lambda: {"total": 0, "failures": 0})
    for e in events:
        ts = e.get("timestamp")
        if not ts:
            continue
        key = ts[:13]  # YYYY-MM-DDTHH
        buckets[key]["total"] += 1
        if e["event_type"] in ("auth_failure", "invalid_user"):
            buckets[key]["failures"] += 1

    return [
        {"time": k, "total": v["total"], "failures": v["failures"]}
        for k, v in sorted(buckets.items())
    ]
