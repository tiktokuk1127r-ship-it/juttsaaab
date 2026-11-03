#!/usr/bin/env python3
"""
WhatsApp Number Checker PRO - Telegram Bot Control (single file)
  Roles: 👑 Owner (full control + Members mgmt) | 🛡 Admin | 👤 Member (alada limited panel, nijer data/limit)

Run:      python wa_checker.py
Re-setup: python wa_checker.py --setup   (token / admin ID abar dewar jonno)
Sessions: 1-5 ta WhatsApp session. /sessions  /addsession  /delsession   (Menu > Connect theke-o hoy)
Env:      TG_BOT_TOKEN, TG_ADMIN_ID      (optional)

Notes:
  * Result .txt/.csv file e SHUDHU sheshbar er run er data ashe (purano result ashe na).
  * Default check limit: 10000 per run.
  * Premium (custom) emoji: bot owner er Telegram Premium lagbe. Setup: /emoji
"""
import argparse
import asyncio
import functools
import html
import io
import json
import logging
import os
import random
import re
import sys
import threading
import time
import itertools
from collections import deque
from pathlib import Path

import qrcode
from telegram import (BotCommand, BotCommandScopeChat, InlineKeyboardButton as Btn, InlineKeyboardMarkup as Markup,
                      InputMediaPhoto, MessageEntity, Update)
from telegram.constants import ParseMode
from telegram.error import BadRequest
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler, ContextTypes, Defaults,
                          ExtBot, MessageHandler, filters)

try:
    from neonize.client import NewClient
    from neonize.events import ConnectedEv, DisconnectedEv
except ImportError:
    print("❌ neonize install kora nai. Run: pip install -r requirements.txt")
    sys.exit(1)
try:
    from neonize.events import LoggedOutEv
except ImportError:
    LoggedOutEv = None

# ======================= Logging (ring buffer for /logs) =======================


class RingHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.buf = deque(maxlen=40)

    def emit(self, record):
        self.buf.append(self.format(record))


ring = RingHandler()
ring.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S"))
logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO,
                    handlers=[logging.StreamHandler(), ring])
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("wa-checker")
esc = html.escape

DATA = Path("data")
DATA.mkdir(exist_ok=True)
CONFIG_F = DATA / "config.json"
RESULTS_F = DATA / "results.csv"
QUEUE_F = DATA / "queue.txt"
LAST_F = DATA / "last_run.csv"   # shudhu sheshbar er run er result
RUN_ID_F = DATA / "last_run.id"  # sheshbar er run er id (timestamp)
SESSION_DB = str(DATA / "wa_session.sqlite3")

DEFAULTS = {
    "bot_token": "",
    "admins": [],          # prothom ID = owner
    "min_delay": 4,
    "max_delay": 9,
    "max_per_run": 10000,
    "default_cc": "",
    "use_premium": True,   # premium (custom) emoji on/off
    "premium_emoji": {},   # {"✅": "custom_emoji_id", ...}  (/emoji diye set hoy)
    "members": {},         # {"uid": {name, username, daily_limit, expires, banned, used, day, total, ...}}
    "pending": {},         # access request pending {"uid": {name, username, ts}}
    "blocked": [],         # block kora user id
    "accept_requests": True,
    "member_defaults": {"daily_limit": 200, "max_per_run": 100, "max_queue": 2000},
    "emoji_packs": {},     # {"PackName": {"title":..., "map": {emoji: id}, "total": n}}
    "maintenance": {"on": False, "msg": "", "since": 0},   # ON hole shudhu admin/owner use korte pare
    "wa_slots": 1,         # koyta WhatsApp session (1-5). /addsession diye barano jay
}

# ======================= Config =======================
cfg = dict(DEFAULTS)


def save_cfg():
    CONFIG_F.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(CONFIG_F, 0o600)
    except OSError:
        pass


def load_cfg():
    existed = CONFIG_F.exists()
    if existed:
        try:
            cfg.update(json.loads(CONFIG_F.read_text(encoding="utf-8")))
        except Exception:
            log.warning("config.json porte problem, default use hocche")
    for k, t in (("members", dict), ("pending", dict), ("blocked", list), ("member_defaults", dict), ("emoji_packs", dict), ("maintenance", dict)):
        if not isinstance(cfg.get(k), t):
            cfg[k] = t()
    # Migration: purano config e max_per_run 200 chilo -> notun limit 10000
    if cfg.get("cfg_version", 1) < 2:
        cfg["max_per_run"] = 10000
        cfg["cfg_version"] = 2
        if existed:
            save_cfg()
    if os.getenv("TG_BOT_TOKEN"):
        cfg["bot_token"] = os.environ["TG_BOT_TOKEN"].strip()
    if os.getenv("TG_ADMIN_ID", "").strip().isdigit():
        aid = int(os.environ["TG_ADMIN_ID"].strip())
        if aid not in cfg["admins"]:
            cfg["admins"].insert(0, aid)


def setup_wizard():
    print("\n=== Telegram Bot Setup ===")
    while True:
        t = input("Bot Token (@BotFather theke): ").strip()
        if re.fullmatch(r"\d{6,}:[A-Za-z0-9_-]{30,}", t):
            break
        print("❌ Token format thik na, abar dao.")
    while True:
        a = input("Tomar Telegram User ID (@userinfobot theke): ").strip()
        if a.isdigit():
            break
        print("❌ ID shudhu number hobe.")
    cfg["bot_token"] = t
    aid = int(a)
    cfg["admins"] = [aid] + [x for x in cfg["admins"] if x != aid]
    save_cfg()
    print("✅ Saved: data/config.json\n")


# ======================= Premium (custom) emoji =======================
# Bot owner er Telegram Premium thakle bot message/button e custom emoji dekhano jay.
# Premium na thakle ba kichu vul hole ager normal emoji ta-i dekhabe (safe fallback).
EMOJI_SET = ("✅ ❌ ⚠️ 🟢 🟡 🟠 🔴 ▶️ ⏸ ⏹ ➕ 📊 📱 ⚙️ 🔁 🗑 📜 🔄 🏠 🔢 ♻️ 📷 ⏳ 💡 📞 🛑 📡 📈 🆕 "
             "📚 📥 🌍 📦 ⏱ 🛡 ⚖️ ⚡ 👑 👥 📄 ⛔ ❎ 💎 💾 🔒 🚫 📅 👤 📢 🙋 🛠").split()


def norm_key(s):
    return s.replace("\ufe0f", "").replace("\u200d", "").strip()


EMOJI_KEYS = [norm_key(e) for e in EMOJI_SET]
_SKIP_RE = re.compile(r"(<pre\b.*?</pre>|<code\b.*?</code>)", re.S)


class PE:
    broken = False   # Telegram bar bar reject korle auto-off
    strikes = 0
    _sig = None
    _rx = None

    @staticmethod
    def table():
        t = cfg.get("premium_emoji")
        return t if isinstance(t, dict) else {}

    @classmethod
    def active(cls):
        return bool(cfg.get("use_premium", True)) and not cls.broken and bool(cls.table())

    @classmethod
    def rx(cls):
        t = cls.table()
        sig = tuple(sorted(t))
        if sig != cls._sig:
            keys = sorted(t, key=len, reverse=True)
            cls._rx = re.compile("(" + "|".join(re.escape(k) for k in keys) + ")\ufe0f?") if keys else None
            cls._sig = sig
        return cls._rx

    @classmethod
    def lead(cls, text):
        """Button text er shurur emoji premium hole (custom_emoji_id, baki text) dey."""
        rx = cls.rx()
        m = rx.match(text) if rx else None
        if not m:
            return None
        rest = text[m.end():].lstrip()
        return (cls.table()[m.group(1)], rest) if rest else None

    @classmethod
    def strike(cls, err):
        if re.search(r"emoji|entit|premium|icon|custom", str(err).lower()):
            cls.strikes += 1
            log.warning("Premium emoji reject (%s/3): %s", cls.strikes, err)
            if cls.strikes >= 3:
                cls.broken = True
                log.error("Premium emoji auto-off (Telegram reject korche). Settings theke abar ON koro.")


def px(text):
    """Text er mapped emoji gulo <tg-emoji> e convert kore (<pre>/<code> er vitore na)."""
    if not isinstance(text, str) or not PE.active():
        return text
    rx, t = PE.rx(), PE.table()

    def sub(m):
        return f'<tg-emoji emoji-id="{t[m.group(1)]}">{m.group(0)}</tg-emoji>'

    parts = _SKIP_RE.split(text)
    for i in range(0, len(parts), 2):
        parts[i] = rx.sub(sub, parts[i])
    return "".join(parts)


def px_markup(rm):
    """Inline button er shurur emoji ke premium icon (icon_custom_emoji_id) banay."""
    if not isinstance(rm, Markup) or not PE.active():
        return rm
    rows = []
    for row in rm.inline_keyboard:
        new = []
        for b in row:
            m = PE.lead(b.text) if b.callback_data is not None else None
            if m:
                new.append(Btn(m[1], callback_data=b.callback_data, api_kwargs={"icon_custom_emoji_id": m[0]}))
            else:
                new.append(b)
        rows.append(new)
    return Markup(rows)


class PEBot(ExtBot):
    """Shob outgoing message/caption/button e auto premium emoji boshay. Reject hole plain version e retry kore."""

    async def _pe(self, fn, args, kwargs, pos=None, key="text"):
        if not PE.active():
            return await fn(*args, **kwargs)
        a2, k2 = list(args), dict(kwargs)
        if pos is not None and len(a2) > pos and isinstance(a2[pos], str):
            a2[pos] = px(a2[pos])
        if isinstance(k2.get(key), str):
            k2[key] = px(k2[key])
        if "reply_markup" in k2:
            k2["reply_markup"] = px_markup(k2["reply_markup"])
        try:
            return await fn(*a2, **k2)
        except BadRequest as e:
            if "not modified" in str(e).lower():
                raise
            PE.strike(e)
            return await fn(*args, **kwargs)

    async def send_message(self, *args, **kwargs):
        return await self._pe(super().send_message, args, kwargs, pos=1, key="text")

    async def edit_message_text(self, *args, **kwargs):
        return await self._pe(super().edit_message_text, args, kwargs, pos=0, key="text")

    async def edit_message_caption(self, *args, **kwargs):
        return await self._pe(super().edit_message_caption, args, kwargs, key="caption")

    async def send_photo(self, *args, **kwargs):
        return await self._pe(super().send_photo, args, kwargs, key="caption")

    async def send_document(self, *args, **kwargs):
        return await self._pe(super().send_document, args, kwargs, key="caption")


def split_custom_emoji(msg):
    """Message theke custom emoji gulo ber kore. Return: (text, [(id, fallback)]); text e emoji er jaygay '\\x00'."""
    text = msg.text or msg.caption or ""
    ents = msg.entities if msg.text else msg.caption_entities
    ents = sorted((e for e in (ents or []) if e.type == MessageEntity.CUSTOM_EMOJI), key=lambda e: e.offset)
    raw = text.encode("utf-16-le")   # Telegram offset UTF-16 unit e dey
    out, ids, pos = [], [], 0
    for e in ents:
        out.append(raw[pos * 2:e.offset * 2].decode("utf-16-le"))
        out.append("\x00")
        ids.append((e.custom_emoji_id, raw[e.offset * 2:(e.offset + e.length) * 2].decode("utf-16-le")))
        pos = e.offset + e.length
    out.append(raw[pos * 2:].decode("utf-16-le"))
    return "".join(out), ids


def pairs_from_message(msg, skip_command=False):
    """'✅ [premium]' hole ✅ -> premium id. Shudhu [premium] hole tar nijer fallback char -> id."""
    text, ids = split_custom_emoji(msg)
    if skip_command:
        text = re.sub(r"^/\w+(@\w+)?", "", text, count=1)
    pairs, pending, i = [], None, 0
    for ch in text:
        if ch == "\x00":
            cid, fallback = ids[i]
            i += 1
            key = pending or norm_key(fallback)
            pending = None
            if key and ord(key[0]) > 127 and str(cid).isdigit():
                pairs.append((key, str(cid)))
        elif ch.isspace() or ch in "\ufe0f\u200d":
            continue
        elif ord(ch) > 127:
            pending = ch
        else:
            pending = None
    return pairs


def has_custom_emoji(msg):
    ents = msg.entities if msg.text else msg.caption_entities
    return any(e.type == MessageEntity.CUSTOM_EMOJI for e in (ents or []))


def apply_emoji_map(mapping):
    t = cfg.get("premium_emoji")
    if not isinstance(t, dict):
        t = cfg["premium_emoji"] = {}
    t.update(mapping)
    PE.broken, PE.strikes = False, 0
    save_cfg()


# ======================= Data (per-user Store) =======================
class Job:
    """Ekta store er (admin ba member) job state."""

    def __init__(self):
        self.running = False
        self.paused = False
        self.waiting = False   # (ekhon ar line nei, UI er jonno rakha)
        self.count = 0
        self.target = 0
        self.started = 0.0
        self.last = None
        self.run_id = 0
        self.rc = {"registered": 0, "unregistered": 0, "error": 0}


def normalize(raw):
    n = re.sub(r"\D", "", raw)
    cc = re.sub(r"\D", "", cfg.get("default_cc", ""))
    if cc and n.startswith("0"):
        n = cc + n[1:]
    return n if 7 <= len(n) <= 15 else None


class Store:
    """
    Ekjon user er queue + results + last run.
    * ADMIN store: owner + shob admin der shared (data/results.csv ... purano file gulo-i)
    * Member store: prottek member er alada folder (data/users/<id>/), keu kar data dekhte pay na
    """

    def __init__(self, key, folder, is_admin=False, uid=None):
        self.key, self.is_admin, self.uid = key, is_admin, uid
        self.dir = Path(folder)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.results_f = self.dir / "results.csv"
        self.queue_f = self.dir / "queue.txt"
        self.last_f = self.dir / "last_run.csv"     # shudhu sheshbar er run er result
        self.run_id_f = self.dir / "last_run.id"
        self.results, self.queue, self.last_run = {}, [], []
        self.lock = threading.Lock()
        self.job = Job()
        self.loaded = False

    def load(self):
        if self.loaded:
            return
        self.loaded = True
        if self.results_f.exists():
            for line in self.results_f.read_text().splitlines()[1:]:
                parts = line.split(",")
                if len(parts) == 2 and parts[0]:
                    self.results[parts[0]] = parts[1]
        else:
            self.results_f.write_text("number,status\n")
        if self.queue_f.exists():
            self.queue.extend(x for x in self.queue_f.read_text().splitlines() if x.strip())
        if self.last_f.exists():
            for line in self.last_f.read_text().splitlines()[1:]:
                parts = line.split(",")
                if len(parts) == 2 and parts[0]:
                    self.last_run.append((parts[0], parts[1]))
        if self.run_id_f.exists():
            try:
                self.job.run_id = int(self.run_id_f.read_text().strip())
            except ValueError:
                pass

    def save_queue(self):
        self.queue_f.write_text("\n".join(self.queue))

    def set_result(self, number, status):
        with self.lock:
            self.results[number] = status
            with open(self.results_f, "a") as f:
                f.write(f"{number},{status}\n")

    def rewrite_results(self):
        with self.lock:
            self.results_f.write_text(
                "\n".join(["number,status"] + [f"{n},{s}" for n, s in self.results.items()]) + "\n")

    def add_numbers(self, text, cap=None):
        """cap = max queue size (member der jonno). Return: (added, skipped)."""
        seen = set(self.queue)
        added = skipped = 0
        for raw in re.split(r"[\s,;]+", text):
            if not raw:
                continue
            n = normalize(raw)
            if not n or n in self.results or n in seen or (cap and len(self.queue) >= cap):
                skipped += 1
                continue
            seen.add(n)
            self.queue.append(n)
            added += 1
        self.save_queue()
        return added, skipped

    def counts(self):
        c = {"registered": 0, "unregistered": 0, "error": 0}
        for s in self.results.values():
            if s in c:
                c[s] += 1
        return c


# Admin (owner + co-admins) shared store. Purano code er jonno alias:
ADMIN = Store("admin", DATA, is_admin=True)
results, queue, last_run = ADMIN.results, ADMIN.queue, ADMIN.last_run
data_lock = ADMIN.lock
job = ADMIN.job


def load_data():
    ADMIN.load()


def save_queue():
    ADMIN.save_queue()


def set_result(number, status):
    ADMIN.set_result(number, status)


def rewrite_results():
    ADMIN.rewrite_results()


def add_numbers(text):
    return ADMIN.add_numbers(text)


def counts():
    return ADMIN.counts()


# ======================= WhatsApp (neonize) - multi session (1-5) =======================
MAX_SESSIONS = 5


class WASession:
    """Ekta WhatsApp account. Prottek session er alada sqlite DB. Slot #1 = purano session (data/wa_session.sqlite3)."""

    def __init__(self, slot):
        self.slot = slot
        self.db = str(DATA / ("wa_session.sqlite3" if slot == 1 else f"wa_session_{slot}.sqlite3"))
        self.status = "starting"   # starting | qr | ready | disconnected
        self.qr_png = None
        self.me = None
        self.client = None
        self.qr_watch = {}         # chat_id -> message_id (QR message live-refresh hoy)
        self.auto_sent = False
        self.gen = 0               # client generation (purano client er callback ignore korar jonno)
        self.qr_at = 0.0
        self.since = 0.0
        self.dis_at = 0.0
        self.restart_req = False
        self.checks = 0            # ei session diye koyta check hoyeche (process cholar somoy)
        self.busy = False          # ekhon kono job ei session diye check korche
        self.next_at = 0.0         # ei session ke abar kokhon use kora jabe (per-account delay)
        self.rlock = threading.Lock()


SESSIONS = {}                      # slot -> WASession
_ens_lock = threading.Lock()
_rr = itertools.count()
LOOP = None
APP = None


def wa_slots():
    try:
        n = int(cfg.get("wa_slots", 1))
    except (TypeError, ValueError):
        n = 1
    return max(1, min(MAX_SESSIONS, n))


def sessions_sorted():
    return sorted(SESSIONS.values(), key=lambda s: s.slot)


def ready_sessions():
    return [s for s in sessions_sorted() if s.status == "ready"]


def any_ready():
    return bool(ready_sessions())


def pick_slot(arg=None):
    """arg thakle oi slot, na hole prothom 'connected na' session, na hole #1."""
    if arg is not None and str(arg).isdigit() and int(arg) in SESSIONS:
        return SESSIONS[int(arg)]
    ss = sessions_sorted()
    for s in ss:
        if s.status != "ready":
            return s
    return ss[0] if ss else None


def qr_caption(s):
    return (f"📷 <b>WhatsApp QR Code · Session #{s.slot}</b>\n\n"
            "WhatsApp ➜ Linked Devices ➜ Link a Device\n"
            "⏳ QR proti ~20 sec e <b>auto-refresh</b> hoy. Ei message e notun QR ashle sathe sathe scan koro.\n"
            "💡 QR e na hole <b>🔢 Pairing Code</b> use koro.")


def run_async(coro):
    """Kono thread theke bot er event loop e coroutine chalano."""
    if LOOP:
        asyncio.run_coroutine_threadsafe(coro, LOOP)


def make_qr_png(text):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(text)
    qr.make(fit=True)
    buf = io.BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
    return buf.getvalue()


def qr_kb(s):
    return Markup([[Btn("🔢 Pairing Code", callback_data=f"conn:pair:{s.slot}"), Btn("🏠 Menu", callback_data="menu:main")]])


async def send_qr(chat_id, s):
    msg = await APP.bot.send_photo(chat_id, s.qr_png, caption=qr_caption(s), reply_markup=qr_kb(s))
    s.qr_watch[chat_id] = msg.message_id


async def refresh_qr_watchers(s):
    if not s.qr_png:
        return
    if not s.qr_watch and not s.auto_sent and cfg["admins"]:
        s.auto_sent = True
        try:
            await send_qr(cfg["admins"][0], s)
        except Exception as e:
            log.warning("auto QR send failed (#%s): %s", s.slot, e)
        return
    cap = qr_caption(s)

    def media(pe):
        return InputMediaPhoto(s.qr_png, caption=px(cap) if pe else cap, parse_mode=ParseMode.HTML)

    for cid, mid in list(s.qr_watch.items()):
        try:
            try:
                await APP.bot.edit_message_media(chat_id=cid, message_id=mid, reply_markup=px_markup(qr_kb(s)),
                                                 media=media(True))
            except BadRequest as e:
                if "not modified" in str(e).lower() or not PE.active():
                    raise
                PE.strike(e)
                await APP.bot.edit_message_media(chat_id=cid, message_id=mid, reply_markup=qr_kb(s),
                                                 media=media(False))
        except BadRequest as e:
            if "not modified" not in str(e).lower():
                s.qr_watch.pop(cid, None)
        except Exception:
            s.qr_watch.pop(cid, None)


async def on_connected_async(s):
    for cid, mid in list(s.qr_watch.items()):
        try:
            await APP.bot.edit_message_caption(
                cid, mid, caption=f"✅ <b>Session #{s.slot} connected!</b>\n<code>+{esc(str(s.me))}</code>")
        except Exception:
            pass
    s.qr_watch.clear()
    for aid in cfg["admins"]:
        try:
            await APP.bot.send_message(
                aid, f"✅ <b>WhatsApp #{s.slot} connected</b> · <code>+{esc(str(s.me))}</code>\n/menu diye dashboard kholo.")
        except Exception:
            pass


def build_client(s, gen):
    client = NewClient(s.db)

    def alive():
        return gen == s.gen   # purano (replace howa) client er event ignore

    def on_qr(_, data_qr):
        if not alive():
            return
        try:
            text = data_qr.decode() if isinstance(data_qr, (bytes, bytearray)) else str(data_qr)
            png = make_qr_png(text)
        except Exception as e:
            log.error("QR image toiri failed (#%s): %s", s.slot, e)
            return
        s.status = "qr"
        s.qr_png = png
        s.qr_at = time.time()
        log.info("New QR generated (#%s)", s.slot)
        run_async(refresh_qr_watchers(s))

    client.event.qr(on_qr)

    @client.event(ConnectedEv)
    def _connected(_, __):
        if not alive():
            return
        s.status = "ready"
        s.qr_png = None
        s.auto_sent = False
        try:
            s.me = client.get_me().JID.User
        except Exception:
            s.me = "connected"
        log.info("WhatsApp #%s connected: %s", s.slot, s.me)
        run_async(on_connected_async(s))

    @client.event(DisconnectedEv)
    def _disconnected(_, __):
        if not alive():
            return
        s.status = "disconnected"
        s.dis_at = time.time()
        log.warning("WhatsApp #%s disconnected", s.slot)

    if LoggedOutEv:
        @client.event(LoggedOutEv)
        def _loggedout(_, __):
            if not alive():
                return
            s.status = "disconnected"
            s.dis_at = time.time()
            log.warning("WhatsApp #%s logged out", s.slot)

    return client


def _safe(fn):
    try:
        fn()
    except Exception as e:
        log.debug("safe call failed: %s", e)


def _start_client(s):
    s.gen += 1
    gen = s.gen
    s.status = "starting"
    s.since = time.time()
    s.qr_png = None
    s.restart_req = False
    c = build_client(s, gen)
    s.client = c

    def runner():
        try:
            c.connect()  # version bhede blocking hote pare, na-o hote pare
            if hasattr(c, "idle"):
                c.idle()
            else:
                threading.Event().wait()
        except Exception as e:
            if gen == s.gen:
                log.error("WA #%s error: %s", s.slot, e)
                s.status = "disconnected"
                s.dis_at = time.time()

    threading.Thread(target=runner, daemon=True, name=f"wa-client-{s.slot}-{gen}").start()


def restart_client(s, reason="manual"):
    """Ei session er purano client bondho kore notun client + notun QR/websocket shuru kore."""
    with s.rlock:
        log.warning("WhatsApp #%s client restart (%s)", s.slot, reason)
        old = s.client
        s.gen += 1   # purano client er callback ekhon theke ignore
        if old is not None:
            fn = getattr(old, "disconnect", None)
            if fn:
                threading.Thread(target=lambda f=fn: _safe(f), daemon=True).start()
        time.sleep(2)
        _start_client(s)


def _session_files(s):
    return list(DATA.glob(Path(s.db).name + "*"))


def _drop_session(s):
    """Session remove: logout + disconnect + DB file delete."""
    s.gen += 1
    c = s.client
    if c is not None:
        _safe(c.logout)
        _safe(c.disconnect)
    time.sleep(1)
    for p in _session_files(s):
        try:
            p.unlink()
        except OSError as e:
            log.warning("delete %s failed: %s", p, e)
    log.info("WhatsApp session #%s removed", s.slot)


def ensure_sessions():
    """cfg['wa_slots'] onujayi session toiri/remove kore. Supervisor ar /addsession duitai eta use kore."""
    with _ens_lock:
        n = wa_slots()
        for slot in range(1, n + 1):
            if slot not in SESSIONS:
                s = WASession(slot)
                SESSIONS[slot] = s
                try:
                    _start_client(s)
                except Exception as e:
                    log.error("WA #%s start error: %s", slot, e)
                    s.status = "disconnected"
                    s.dis_at = time.time()
                time.sleep(1)   # ekshathe shob client shuru na kore ektu gap
        for slot in [k for k in SESSIONS if k > n]:
            _drop_session(SESSIONS.pop(slot))


def wa_thread():
    """
    Supervisor: prottek session er QR expire / disconnected / atke thakle nijei notun client + fresh QR toiri kore.
    Session sonkhha cfg['wa_slots'] diye control hoy (1-5).
    """
    while True:
        try:
            ensure_sessions()
            now = time.time()
            for s in sessions_sorted():
                st = s.status
                reason = None
                if s.restart_req:
                    reason = "requested"
                elif st == "qr" and s.qr_at and now - s.qr_at > 75:
                    reason = "QR expired (notun QR ashe nai)"
                elif st == "starting" and now - s.since > 60:
                    reason = "connect atke ache"
                elif st == "disconnected" and now - s.dis_at > 45:
                    reason = "disconnected onekkhon"
                if reason:
                    restart_client(s, reason)
        except Exception as e:
            log.error("WA supervisor error: %s", e)
            time.sleep(10)
        time.sleep(5)


def wa_check(number):
    """Connected session gulo te round-robin kore check kore. Ekta session fail korle onno session e ekbar retry."""
    ready = ready_sessions()
    if not ready:
        raise RuntimeError("WhatsApp connected na (websocket not connected)")
    k = next(_rr)
    order = [ready[(k + i) % len(ready)] for i in range(len(ready))]
    last = None
    for s in order[:2]:
        try:
            res = s.client.is_on_whatsapp("+" + number)
            if not res:
                raise RuntimeError("empty response")
            s.checks += 1
            return "registered" if res[0].IsIn else "unregistered"
        except Exception as e:
            last = e
            log.warning("session #%s check error: %s", s.slot, e)
    raise last


_waiters = deque()   # FIFO: shob job er session chaoya, jate keu na-khey na thake


async def _grab_session(skip):
    """Ekta free + ready session nao. Opekkha korle FIFO line e. Kono ready session na thakle error."""
    me = object()
    _waiters.append(me)
    try:
        while True:
            ready = [x for x in ready_sessions() if x.slot not in skip]
            if not ready:
                raise RuntimeError("WhatsApp connected na (websocket not connected)")
            if _waiters[0] is me:
                free = [x for x in ready if not x.busy]
                if free:
                    sess = min(free, key=lambda x: x.next_at)
                    sess.busy = True      # await er age-i set, tai race hobe na
                    return sess
            await asyncio.sleep(0.2)
    finally:
        _waiters.remove(me)


async def wa_check_paced(number):
    """
    Shob job (admin + member) ekshathe cholleo ei function diye check hoy.
    Prottek session ekbare ekta check kore, ar tar nijer min/max delay mane -> account er pace safe thake,
    kintu connected session joto beshi, shob job mile toto fast.
    Ekta session fail korle onno session e ekbar retry.
    """
    skip, last = set(), None
    for _ in range(2):
        try:
            sess = await _grab_session(skip)
        except RuntimeError:
            if last is not None:
                raise last
            raise
        try:
            wait = sess.next_at - time.time()
            if wait > 0:
                await asyncio.sleep(wait)
            if sess.status != "ready" or sess.client is None:
                raise RuntimeError(f"session #{sess.slot} disconnected")
            res = await asyncio.to_thread(sess.client.is_on_whatsapp, "+" + number)
            if not res:
                raise RuntimeError("empty response")
            sess.checks += 1
            return "registered" if res[0].IsIn else "unregistered"
        except Exception as e:
            last = e
            skip.add(sess.slot)
            log.warning("session #%s check error: %s", sess.slot, e)
        finally:
            sess.next_at = time.time() + random.uniform(cfg["min_delay"], max(cfg["max_delay"], cfg["min_delay"]))
            sess.busy = False
    raise last


async def _wait_qr(s, timeout):
    for _ in range(int(timeout * 2)):
        if s.status == "ready":
            raise RuntimeError(f"Session #{s.slot} already connected.")
        if s.status == "qr" and s.qr_png:
            return True
        await asyncio.sleep(0.5)
    return False


def _call_pair(fn, phone):
    try:
        return fn(phone, True)
    except TypeError:
        return fn(phone)


async def request_pair_code(phone, s):
    """Pairing code toiri kore. Session connected + unpaired (QR stage) thakte hobe. Dorkar hole auto-reconnect."""
    if s is None:
        raise RuntimeError("Ei session nai.")
    if s.status == "ready":
        raise RuntimeError(f"Session #{s.slot} already connected.")
    if not await _wait_qr(s, 20):
        await asyncio.to_thread(restart_client, s, "pair: QR stage e pouchhai nai")
        if not await _wait_qr(s, 40):
            raise RuntimeError("WhatsApp server e connect hoyni. Internet/VPN/DNS check koro (web.whatsapp.com), "
                               "na hole Reset Session dao.")
    fn = getattr(s.client, "PairPhone", None) or getattr(s.client, "pair_phone", None)
    if not fn:
        raise RuntimeError("Ei neonize version e PairPhone nai. Run: pip install -U neonize")
    await asyncio.sleep(1)   # websocket ready howar jonno ektu somoy
    last = None
    for attempt in (1, 2):
        try:
            code = str(await asyncio.to_thread(_call_pair, fn, phone)).strip()
            if len(code) == 8 and "-" not in code:
                code = code[:4] + "-" + code[4:]
            return code
        except Exception as e:
            last = e
            if attempt == 1 and re.search(r"not connected|websocket|closed|eof", str(e), re.I):
                await asyncio.to_thread(restart_client, s, "pair: websocket not connected")
                if await _wait_qr(s, 40):
                    fn = getattr(s.client, "PairPhone", None) or getattr(s.client, "pair_phone", None)
                    await asyncio.sleep(1)
                    continue
            break
    raise RuntimeError(f"Pairing code toiri hoyni: {last}")


def reset_session_and_restart(slot=1):
    """Ei slot er session muche (logout + DB delete) pura bot restart kore. Onno session er login thake."""
    s = SESSIONS.get(slot)
    if s is not None:
        s.gen += 1
        _safe(s.client.logout)
        files = _session_files(s)
    else:
        files = list(DATA.glob("wa_session.sqlite3*" if slot == 1 else f"wa_session_{slot}.sqlite3*"))
    for p in files:
        try:
            p.unlink()
        except OSError as e:
            log.warning("delete %s failed: %s", p, e)
    log.info("Restarting process...")
    os.execv(sys.executable, [sys.executable] + sys.argv)


# ======================= Job =======================
def bar(p, n=10):
    f = max(0, min(n, int(round(p * n))))
    return "▰" * f + "▱" * (n - f)


def fmt_dur(s):
    s = int(s)
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}m {s:02d}s"
    h, m = divmod(m, 60)
    return f"{h}h {m:02d}m"


def sess_line(s):
    return {
        "starting": "🟡 Starting…",
        "qr": "🟠 Link korar opekkhay",
        "ready": f"🟢 Connected · <code>+{esc(str(s.me))}</code>",
        "disconnected": "🔴 Disconnected",
    }[s.status]


def wa_line():
    ss = sessions_sorted()
    if not ss:
        return "🟡 Starting…"
    if len(ss) == 1:
        return sess_line(ss[0])
    ok = sum(1 for s in ss if s.status == "ready")
    dot = "🟢" if ok == len(ss) else ("🟡" if ok else "🔴")
    return f"{dot} <b>{ok}/{len(ss)}</b> session connected"


LINE = "━━━━━━━━━━━━━━━━"


def dashboard_text():
    c = counts()
    tot = c["registered"] + c["unregistered"]
    hit = f"{c['registered'] * 100 // tot}%" if tot else "—"
    if job.running:
        j = ("⏸ Paused" if job.paused else "🔄 Running") + f" · {job.count}/{job.target}"
    else:
        j = "⏹ Idle"
    return (f"📡 <b>WA Number Checker PRO</b>\n{LINE}\n"
            f"<b>WhatsApp</b>  {wa_line()}\n<b>Job</b>  {j}\n<b>Queue</b>  <code>{len(queue)}</code>\n"
            f"👥 <b>Members</b>  {members_line()}{maint_badge()}\n{LINE}\n"
            f"✅ Registered     <b>{c['registered']}</b>\n"
            f"❌ Unregistered   <b>{c['unregistered']}</b>\n"
            f"⚠️ Error          <b>{c['error']}</b>\n"
            f"📈 Hit rate       <b>{hit}</b>  ·  Total <b>{len(results)}</b>")


def main_kb():
    pause_lbl = "▶️ Resume" if job.paused else "⏸ Pause"
    return Markup([
        [Btn("▶️ Start", callback_data="act:run"), Btn(pause_lbl, callback_data="act:pause"),
         Btn("⏹ Stop", callback_data="act:stop")],
        [Btn("➕ Add Numbers", callback_data="menu:add"), Btn("📊 Results", callback_data="menu:results")],
        [Btn("📱 Connect", callback_data="menu:connect"), Btn("⚙️ Settings", callback_data="menu:settings")],
        [Btn("🔁 Retry Errors", callback_data="act:retry"), Btn("🗑 Clear Queue", callback_data="act:clearq")],
        [Btn("👥 Members", callback_data="menu:members")],
        [Btn("📜 Logs", callback_data="act:logs"), Btn("🔄 Refresh", callback_data="menu:main")],
    ])


def back_row():
    return [Btn("🏠 Menu", callback_data="menu:main")]


def job_state(j):
    if j.running and j.waiting:
        return "⏳ Line e opekkha"
    if j.running:
        return ("⏸ Paused" if j.paused else "🔄 Running") + f" · {j.count}/{j.target}"
    return "⏹ Idle"


def live_text(final=None, store=None):
    store = store or ADMIN
    job = store.job
    tgt = max(job.target, 1)
    p = job.count / tgt
    el = time.time() - job.started if job.started else 0
    eta = fmt_dur(el / job.count * (tgt - job.count)) if job.count and not final else "—"
    last = ""
    if job.last:
        icon = {"registered": "✅", "unregistered": "❌", "error": "⚠️"}[job.last[1]]
        last = f"\nLast: <code>{job.last[0]}</code> {icon}"
    head = final or ("⏸ <b>Paused</b>" if job.paused else "🔄 <b>Checking…</b>")
    return (f"{head}\n{LINE}\n<code>{bar(p)}</code> <b>{int(p * 100)}%</b>\n"
            f"{job.count}/{job.target} · ⏱ {fmt_dur(el)} · ETA {eta}\n"
            f"✅ {job.rc['registered']}  ❌ {job.rc['unregistered']}  ⚠️ {job.rc['error']}  · Queue {len(store.queue)}{last}")


def run_stamp(j=None):
    j = j or job
    return time.strftime("%Y%m%d_%H%M", time.localtime(j.run_id)) if j.run_id else "lastrun"


def live_kb(done=False, store=None):
    store = store or ADMIN
    member = not store.is_admin
    if done:
        rid = store.job.run_id
        if member:
            return Markup([
                [Btn("📥 Registered", callback_data=f"u:res:reg:{rid}"),
                 Btn("📥 Unregistered", callback_data=f"u:res:unreg:{rid}")],
                [Btn("📊 My Results", callback_data="u:results"), Btn("🏠 Menu", callback_data="u:main")],
            ])
        return Markup([
            [Btn("📥 Registered", callback_data=f"res:lreg:{rid}"),
             Btn("📥 Unregistered", callback_data=f"res:lunreg:{rid}")],
            [Btn("📊 Results", callback_data="menu:results"), Btn("🏠 Menu", callback_data="menu:main")],
        ])
    p = "u" if member else "act"
    return Markup([[Btn("⏸ Pause/Resume", callback_data=f"{p}:pause"), Btn("⏹ Stop", callback_data=f"{p}:stop")]])


async def safe_edit(bot, chat_id, mid, text, kb=None):
    try:
        await bot.edit_message_text(text, chat_id=chat_id, message_id=mid, reply_markup=kb)
    except BadRequest as e:
        if "not modified" not in str(e).lower():
            log.warning("edit failed: %s", e)
    except Exception as e:
        log.warning("edit failed: %s", e)


def running_jobs():
    """Ekhon jara job chalacche (admin store + shob member store)."""
    return [st for st in [ADMIN, *STORES.values()] if st.job.running]


TASKS = set()


def mask(n, member):
    return (n[:4] + "****") if member else n   # log e member er number puro dekha jabe na


async def run_job(app, chat_id, store, msg=None):
    job = store.job
    member = not store.is_admin
    uid = store.uid
    m = mem(uid) if member else None
    cap = m_max_run(m) if m is not None else cfg["max_per_run"]
    job.target = min(cap, len(store.queue))
    if m is not None:
        left = m_left(m)
        if left is not None:
            job.target = min(job.target, left)
    job.started = time.time()
    job.last = None
    job.rc = {"registered": 0, "unregistered": 0, "error": 0}
    # NOTUN RUN: ager run er result puro muche felo, shudhu ei run er data jomabe
    job.run_id = int(time.time())
    store.run_id_f.write_text(str(job.run_id))
    store.last_run.clear()
    store.last_f.write_text("number,status\n")
    if msg:
        await safe_edit(app.bot, chat_id, msg.message_id, live_text(store=store), live_kb(store=store))
    else:
        msg = await app.bot.send_message(chat_id, live_text(store=store), reply_markup=live_kb(store=store))
    err_streak = 0
    unsaved = 0
    last_edit = 0.0
    reason = "✅ <b>Shesh!</b>"
    try:
        while job.running and store.queue and job.count < job.target:
            if job.paused:
                await safe_edit(app.bot, chat_id, msg.message_id, live_text(store=store), live_kb(store=store))
                while job.paused and job.running:
                    await asyncio.sleep(1)
                continue
            if not any_ready():
                reason = "⚠️ <b>WhatsApp connected na, thamlam.</b>"
                break
            if member:
                if maint_on():
                    reason = "🛠 <b>Maintenance shuru hoyeche, job thamano hoyeche.</b> Queue safe ache."
                    break
                if member_state(uid) != "active":
                    reason = "⛔ <b>Tomar access ekhon active na.</b>"
                    break
                left = m_left(m)
                if left is not None and left <= 0:
                    reason = "⛔ <b>Aajker daily limit shesh.</b> Kal abar chalate parbe."
                    break
            n = store.queue[0]
            try:
                st = await wa_check_paced(n)
                err_streak = 0
            except Exception as e:
                log.warning("check %s error: %s", mask(n, member), e)
                st = "error"
                err_streak += 1
            store.queue.pop(0)
            store.save_queue()
            store.set_result(n, st)
            store.last_run.append((n, st))
            with open(store.last_f, "a") as lf:
                lf.write(f"{n},{st}\n")
            job.count += 1
            job.rc[st] += 1
            job.last = (n, st)
            if member and st != "error":    # error number quota te dhore na
                m_bump(uid)
                unsaved += 1
                if unsaved >= 10:
                    save_cfg()
                    unsaved = 0
            if err_streak >= 5:
                reason = "🛑 <b>Porpor 5ta error, safety er jonno thamlam.</b>"
                break
            if time.time() - last_edit >= 3:
                last_edit = time.time()
                await safe_edit(app.bot, chat_id, msg.message_id, live_text(store=store), live_kb(store=store))
            # Delay ekhon per-session (wa_check_paced), tai ekhane aar sleep lagbe na
            await asyncio.sleep(0)
        else:
            if not job.running:
                reason = ("🛠 <b>Maintenance shuru hoyeche, job thamano hoyeche.</b> Queue safe ache."
                          if member and maint_on() else "⏹ <b>Stop kora hoyeche.</b>")
            elif store.queue and job.count >= job.target:
                left = m_left(m) if m is not None else None
                if left is not None and left <= 0:
                    reason = "⛔ <b>Aajker daily limit shesh.</b> Kal abar chalate parbe."
                else:
                    reason = f"⏸ <b>Max per run ({cap}) shesh.</b> Abar ▶️ Start dao."
    finally:
        job.running = False
        if member:
            save_cfg()
    await safe_edit(app.bot, chat_id, msg.message_id, live_text(final=reason, store=store),
                    live_kb(done=True, store=store))
    # Run shesh hole auto: shudhu ei run er Registered / Unregistered txt file
    if job.count:
        stamp = run_stamp(job)
        for kind, base in (("reg", "registered"), ("unreg", "unregistered")):
            try:
                await send_file(app.bot, chat_id, f"{base}_{stamp}.txt", result_lines(kind, "last", store), quiet=True)
            except Exception as e:
                log.warning("auto file send failed: %s", e)


async def worker(app, chat_id, store):
    job = store.job
    member = not store.is_admin
    job.paused = False
    job.count = 0
    job.target = 0
    job.started = 0.0
    job.last = None
    msg = None
    try:
        await run_job(app, chat_id, store, msg)
    finally:
        job.running = False


def start_job(app, chat_id, store=None):
    store = store or ADMIN
    job = store.job
    if job.running:
        return "Already cholche"
    if not store.is_admin:
        if member_state(store.uid) != "active":
            return "⛔ Tomar access active na"
        if maint_on():
            return "🛠 Bot ekhon maintenance e ache, pore try koro"
        left = m_left(mem(store.uid))
        if left is not None and left <= 0:
            return "⛔ Aajker daily limit shesh. Kal abar try koro"
    if not any_ready():
        return ("WhatsApp connected na. 📱 Connect theke link koro" if store.is_admin
                else "Service ekhon offline. Owner ke janao.")
    if not store.queue:
        return "Queue khali. Age number add koro"
    job.running = True
    t = asyncio.create_task(worker(app, chat_id, store))
    TASKS.add(t)
    t.add_done_callback(TASKS.discard)
    return None


# ======================= Menus =======================
def connect_view():
    ss = sessions_sorted()
    lines = "\n".join(f"<b>#{s.slot}</b>  {sess_line(s)}" + (f"  ·  ✔ {s.checks}" if s.checks else "") for s in ss)
    text = (f"📱 <b>WhatsApp Sessions</b>  ({len(ss)}/{MAX_SESSIONS})\n{LINE}\n{lines or '—'}\n\n"
            "• Check cholar somoy shob <b>connected</b> session ghure ghure kaj kore. Delay session er sonkhha diye bhag hoy, "
            "tai prottek account er pace ager moto thake kintu speed barhe.\n"
            "• <b>QR / Pair</b>: session link korar jonno. <b>Reset</b>: oi session muche notun kore link.\n"
            "• <b>➕ Add Session</b>: notun session (max 5). Notun QR nijei ashbe.")
    rows = []
    for s in ss:
        row = []
        if s.status != "ready":
            row += [Btn(f"📷 QR #{s.slot}", callback_data=f"conn:qr:{s.slot}"),
                    Btn(f"🔢 Pair #{s.slot}", callback_data=f"conn:pair:{s.slot}")]
        row.append(Btn(f"♻️ Reset #{s.slot}", callback_data=f"conn:reset:{s.slot}"))
        rows.append(row)
    ctl = []
    if len(ss) < MAX_SESSIONS:
        ctl.append(Btn("➕ Add Session", callback_data="conn:add"))
    if len(ss) > 1:
        ctl.append(Btn("➖ Remove Last", callback_data="conn:del"))
    if ctl:
        rows.append(ctl)
    rows.append(back_row())
    return text, Markup(rows)


def settings_view():
    d = (cfg["min_delay"], cfg["max_delay"])
    cc = cfg["default_cc"]

    def mark(ok, label):
        return ("✅ " if ok else "") + label

    text = (f"⚙️ <b>Settings</b>\n{LINE}\n⏱ Delay: <b>{d[0]:g}–{d[1]:g}s</b>\n"
            f"📦 Max per run: <b>{cfg['max_per_run']}</b>\n🌍 Default country code: <b>{esc(cc) or 'off'}</b>\n"
            f"💎 Premium emoji: <b>{'ON' if PE.active() else 'OFF'}</b> · /emoji\n\n"
            "Custom: /setdelay 4 9 · /setmax 10000 · /setcc 880\n⚠️ Fast mode e ban er jhuki beshi.")
    kb = Markup([
        [Btn(mark(d == (6, 12), "🛡 Safe 6–12s"), callback_data="set:delay:6:12"),
         Btn(mark(d == (4, 9), "⚖️ Normal 4–9s"), callback_data="set:delay:4:9"),
         Btn(mark(d == (2, 5), "⚡ Fast 2–5s"), callback_data="set:delay:2:5")],
        [Btn(mark(cfg["max_per_run"] == n, str(n)), callback_data=f"set:max:{n}") for n in (500, 1000, 5000, 10000)],
        [Btn(mark(cc == "880", "🇧🇩 880"), callback_data="set:cc:880"),
         Btn(mark(cc == "91", "🇮🇳 91"), callback_data="set:cc:91"),
         Btn(mark(cc == "92", "🇵🇰 92"), callback_data="set:cc:92"),
         Btn(mark(not cc, "Off"), callback_data="set:cc:off")],
        [Btn("💎 Premium Emoji: " + ("ON" if cfg.get("use_premium", True) else "OFF"), callback_data="set:pe"),
         Btn("👥 Admins", callback_data="menu:admins")],
        [Btn("💎 Emoji Manager", callback_data="menu:emoji"),
         Btn("🛠 Maintenance: " + ("ON" if maint_on() else "OFF"), callback_data="mt:view")],
        back_row(),
    ])
    return text, kb


def results_view():
    c = counts()
    lr = {"registered": 0, "unregistered": 0, "error": 0}
    for _, st in last_run:
        if st in lr:
            lr[st] += 1
    text = (f"📊 <b>Results</b>\n{LINE}\n"
            f"🆕 <b>Last run</b> ({len(last_run)} ta)\n"
            f"✅ {lr['registered']}  ❌ {lr['unregistered']}  ⚠️ {lr['error']}\n\n"
            f"📚 <b>All time</b> ({len(results)} ta)\n"
            f"✅ {c['registered']}  ❌ {c['unregistered']}  ⚠️ {c['error']}\n\n"
            "📥 .txt / .csv file e shudhu <b>last run</b> er data ashe, purano result ashe na.")
    rid = job.run_id
    kb = Markup([
        [Btn("📥 Registered", callback_data=f"res:lreg:{rid}"), Btn("📥 Unregistered", callback_data=f"res:lunreg:{rid}")],
        [Btn("📥 Errors", callback_data=f"res:lerr:{rid}"), Btn("📥 Last run CSV", callback_data=f"res:lcsv:{rid}")],
        [Btn("💾 Backup CSV (all time)", callback_data="res:csv"), Btn("🗑 Clear Results", callback_data="res:clear")],
        back_row(),
    ])
    return text, kb


def admins_view():
    lines = [f"{'👑' if i == 0 else '•'} <code>{a}</code>" for i, a in enumerate(cfg["admins"])]
    text = f"👥 <b>Admins</b>\n{LINE}\n" + "\n".join(lines) + "\n\n/addadmin ID · /removeadmin ID (owner only)"
    return text, Markup([[Btn("⚙️ Settings", callback_data="menu:settings")], back_row()])


ADD_TEXT = (f"➕ <b>Numbers Add</b>\n{LINE}\n"
            "• Number paste koro (ekta line e ekta, ba comma diye)\n"
            "• Ba <b>.txt / .csv</b> file pathao (boro list, 10000+ number o cholbe)\n"
            "• Country code shoho dao (8801712345678). 0 diye shuru number e auto code boshate: /setcc 880\n\n"
            "Duplicate, invalid ar age check kora number auto skip hoy.")


async def send_file(bot, chat_id, name, lines, quiet=False):
    if not lines:
        if quiet:
            return
        return await bot.send_message(chat_id, f"({esc(name)}: kichu nai)")
    await bot.send_document(chat_id, "\n".join(lines).encode("utf-8"), filename=name,
                            caption=f"📥 {esc(name)} · {len(lines)} ta")


def result_lines(kind, scope="last", store=None):
    """scope: 'last' = shudhu sheshbar er run, 'all' = shob result."""
    store = store or ADMIN
    items = list(store.last_run) if scope == "last" else list(store.results.items())
    if kind == "csv":
        return ["number,status"] + [f"{n},{s}" for n, s in items]
    want = {"reg": "registered", "unreg": "unregistered", "err": "error"}[kind]
    return [n for n, s in items if s == want]


def logs_text():
    return f"📜 <b>Logs</b>\n<pre>{esc(chr(10).join(list(ring.buf)[-25:]) or 'empty')}</pre>"


def do_retry():
    errs = [n for n, s in results.items() if s == "error"]
    for n in errs:
        results.pop(n, None)
    rewrite_results()
    added, _ = add_numbers("\n".join(errs))
    return f"🔁 {added} ta error number queue te dewa hoyeche."


# ======================= Roles: Owner / Admin / Member =======================
# 👑 Owner  = cfg["admins"][0]  -> shob kichu + Members management + broadcast
# 🛡 Admin  = cfg["admins"][1:] -> owner er moto operational panel (Members management baade)
# 👤 Member = cfg["members"]    -> alada limited panel, nijer queue/result/limit, WhatsApp shared
MDEF = {"daily_limit": 200, "max_per_run": 100, "max_queue": 2000}   # 0 = unlimited (daily_limit)


def is_owner(uid):
    return bool(cfg["admins"]) and uid == cfg["admins"][0]


def is_admin(uid):
    return uid in cfg["admins"]


def mdef(key):
    try:
        return int((cfg.get("member_defaults") or {}).get(key, MDEF[key]))
    except (TypeError, ValueError):
        return MDEF[key]


def mem(uid):
    return cfg["members"].get(str(uid))


def mname(uid):
    m = mem(uid)
    return (m.get("name") if m else None) or str(uid)


def m_expired(m):
    e = m.get("expires", 0)
    return bool(e) and time.time() > e


def member_state(uid):
    """None | 'blocked' | 'banned' | 'expired' | 'active'"""
    if uid in cfg["blocked"]:
        return "blocked"
    m = mem(uid)
    if not m:
        return None
    if m.get("banned"):
        return "banned"
    if m_expired(m):
        return "expired"
    return "active"


def m_limit(m):
    try:
        return max(0, int(m.get("daily_limit", mdef("daily_limit"))))
    except (TypeError, ValueError):
        return mdef("daily_limit")


def m_used(m):
    t = time.strftime("%Y-%m-%d")
    if m.get("day") != t:   # notun din = counter reset
        m["day"], m["used"] = t, 0
    return int(m.get("used", 0))


def m_left(m):
    """None = unlimited, nahole aajker baki koyta."""
    lim = m_limit(m)
    return None if lim == 0 else max(0, lim - m_used(m))


def m_max_run(m):
    try:
        return max(1, int(m.get("max_per_run", mdef("max_per_run"))))
    except (TypeError, ValueError):
        return mdef("max_per_run")


def m_bump(uid, n=1):
    m = mem(uid)
    if m:
        m_used(m)
        m["used"] += n
        m["total"] = int(m.get("total", 0)) + n


def fmt_expiry(m):
    e = m.get("expires", 0)
    if not e:
        return "♾ No expiry"
    d = time.strftime("%d %b %Y", time.localtime(e))
    left = e - time.time()
    if left <= 0:
        return f"⌛ Expired ({d})"
    return f"{d} · {int(left // 86400)}d baki"


def add_member(uid, name="", username="", daily_limit=None, days=None):
    now = int(time.time())
    m = cfg["members"].setdefault(str(uid), {
        "name": name or str(uid), "username": username or "", "added": now,
        "banned": False, "day": time.strftime("%Y-%m-%d"), "used": 0, "total": 0, "expires": 0})
    if name:
        m["name"] = name
    if username:
        m["username"] = username
    m["banned"] = False
    if daily_limit is not None:
        m["daily_limit"] = int(daily_limit)
    if days is not None:
        m["expires"] = int(now + days * 86400) if days > 0 else 0
    cfg["pending"].pop(str(uid), None)
    if uid in cfg["blocked"]:
        cfg["blocked"].remove(uid)
    save_cfg()
    return m


STORES = {}


def get_store(uid):
    """Admin hole shared ADMIN store, member hole tar nijer alada store."""
    if is_admin(uid):
        return ADMIN
    st = STORES.get(uid)
    if st is None:
        st = Store(f"u{uid}", DATA / "users" / str(uid), is_admin=False, uid=uid)
        st.load()
        STORES[uid] = st
    return st


def stop_member_job(uid):
    st = STORES.get(uid)
    if st:
        st.job.running = False


# ======================= Telegram: access control =======================
async def no_access(update, context):
    """Admin/member na hole: request access flow (ba block/suspend message)."""
    u, msg = update.effective_user, update.effective_message
    if not u or not msg:
        return
    st = member_state(u.id)
    if st == "blocked":
        return
    if st == "banned":
        return await msg.reply_text("🚫 Tomar access suspend kora hoyeche. Owner er sathe jogajog koro.")
    if st == "expired":
        return await msg.reply_text(
            "⌛ Tomar access er meyad shesh. Renew korte niche button chapo 👇",
            reply_markup=Markup([[Btn("🙋 Request Renewal", callback_data="req:ask")]]))
    if str(u.id) in cfg["pending"]:
        return await msg.reply_text(
            f"⏳ Tomar request pending ache. Owner approve korle jante parbe.\nID: <code>{u.id}</code>")
    if cfg.get("accept_requests", True):
        return await msg.reply_text(
            f"🔒 <b>Private bot</b>\nTomar ID: <code>{u.id}</code>\n\nAccess chaile niche button chapo 👇",
            reply_markup=Markup([[Btn("🙋 Request Access", callback_data="req:ask")]]))
    await msg.reply_text(f"🔒 <b>Private bot</b>\nTomar ID: <code>{u.id}</code>\nOwner er sathe jogajog koro.")


def admin_only(fn):
    @functools.wraps(fn)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        u = update.effective_user
        if u and is_admin(u.id):
            return await fn(update, context)
        if u and member_state(u.id) == "active" and update.effective_message:
            return await update.effective_message.reply_text(
                "⛔ Eta shudhu admin/owner er jonno. Tomar panel: /menu")
        return await no_access(update, context)

    return wrapper


def owner_only(fn):
    @functools.wraps(fn)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        u = update.effective_user
        if u and is_owner(u.id):
            return await fn(update, context)
        if u and is_admin(u.id) and update.effective_message:
            return await update.effective_message.reply_text("👑 Eta shudhu <b>owner</b> er jonno.")
        if u and member_state(u.id) == "active" and update.effective_message:
            return await update.effective_message.reply_text("⛔ Eta shudhu owner er jonno. Tomar panel: /menu")
        return await no_access(update, context)

    return wrapper


def dual(admin_fn, member_fn):
    """Ekoi command/handler e admin ar member der alada system."""
    @functools.wraps(admin_fn)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        u = update.effective_user
        if not u:
            return
        if is_admin(u.id):
            return await admin_fn(update, context)
        if member_state(u.id) == "active":
            if maint_on() and update.effective_message:
                return await update.effective_message.reply_text(maint_text())
            return await member_fn(update, context)
        return await no_access(update, context)

    return wrapper


# ======================= Commands =======================
@admin_only
async def cmd_menu(update, context):
    await update.message.reply_text(dashboard_text(), reply_markup=main_kb())


@admin_only
async def cmd_qr(update, context):
    s = pick_slot(context.args[0] if context.args else None)
    if s is None:
        return await update.message.reply_text("Session ekhono toiri hoyni, kichukkhon por try koro.")
    if s.status == "ready":
        return await update.message.reply_text(f"✅ Session #{s.slot} already connected: <code>+{esc(str(s.me))}</code>")
    if not s.qr_png:
        if s.status == "disconnected":
            s.restart_req = True   # supervisor ~5 sec e notun connection/QR shuru korbe
        return await update.message.reply_text(
            f"QR #{s.slot} ekhono toiri hoyni, 10-15 sec por /qr {s.slot} dao. Na ashle /menu ➜ Connect ➜ Reset koro.")
    await send_qr(update.effective_chat.id, s)


async def handle_pair(update, context, raw, slot=1):
    phone = normalize(raw)
    if not phone:
        context.user_data["await_pair"] = slot
        return await update.message.reply_text(
            "❌ Number thik na. Country code shoho dao, jemon <code>8801712345678</code>. Cancel: /cancel")
    wait = await update.message.reply_text(f"⏳ Session #{slot} er pairing code toiri hocche…")
    try:
        code = await request_pair_code(phone, SESSIONS.get(slot))
    except Exception as e:
        return await wait.edit_text(f"❌ {esc(str(e))}")
    await wait.edit_text(
        f"🔢 <b>Pairing Code · Session #{slot}</b>\n{LINE}\n<code>{esc(code)}</code>\n\n"
        f"Number: <code>+{phone}</code>\n\n"
        "1️⃣ Phone e WhatsApp kholo\n2️⃣ Settings ➜ Linked Devices ➜ Link a Device\n"
        "3️⃣ <b>Link with phone number instead</b> e tap koro\n4️⃣ Upore code ta boshao\n\n"
        "⏳ Code kichukkhon por expire hoy. Na hole abar nao.",
        reply_markup=Markup([[Btn("🔄 Notun Code", callback_data=f"conn:pair:{slot}"), Btn("🏠 Menu", callback_data="menu:main")]]))


@admin_only
async def cmd_pair(update, context):
    a = context.args or []
    s = pick_slot(a[1] if len(a) > 1 else None)
    slot = s.slot if s else 1
    if a:
        return await handle_pair(update, context, a[0], slot)
    context.user_data["await_pair"] = slot
    await update.message.reply_text(
        f"📞 Session #{slot} er jonno WhatsApp number pathao (country code shoho), jemon <code>8801712345678</code>\n"
        "Onno session e link korte: <code>/pair 8801712345678 2</code>\nCancel: /cancel")


@admin_only
async def cmd_sessions(update, context):
    t, kb = connect_view()
    await update.message.reply_text(t, reply_markup=kb)


@admin_only
async def cmd_addsession(update, context):
    n = wa_slots()
    if n >= MAX_SESSIONS:
        return await update.message.reply_text(f"⚠️ Maximum {MAX_SESSIONS} ta session.")
    cfg["wa_slots"] = n + 1
    save_cfg()
    await asyncio.to_thread(ensure_sessions)
    t, kb = connect_view()
    await update.message.reply_text(f"➕ Session #{n + 1} shuru hoyeche. QR nijei ashbe (na ashle /qr {n + 1} ba /pair).\n\n" + t,
                                    reply_markup=kb)


@admin_only
async def cmd_delsession(update, context):
    n = wa_slots()
    if n <= 1:
        return await update.message.reply_text("⚠️ Komporkhe 1 ta session thakte hobe.")
    if not context.args or context.args[0].lower() != "yes":
        return await update.message.reply_text(
            f"➖ Session #{n} remove hobe (WhatsApp logout + session file delete).\nConfirm: <code>/delsession yes</code>")
    cfg["wa_slots"] = n - 1
    save_cfg()
    await asyncio.to_thread(ensure_sessions)
    t, kb = connect_view()
    await update.message.reply_text(f"➖ Session #{n} remove kora hoyeche.\n\n" + t, reply_markup=kb)


@admin_only
async def cmd_cancel(update, context):
    for k in ("await_pair", "await_pack", "await_emoji"):
        context.user_data.pop(k, None)
    await update.message.reply_text("❎ Cancelled.")


@admin_only
async def cmd_run(update, context):
    err = start_job(context.application, update.effective_chat.id)
    if err:
        await update.message.reply_text(f"⚠️ {err}")


@admin_only
async def cmd_pause(update, context):
    if not job.running:
        return await update.message.reply_text("Kono job cholche na.")
    job.paused = not job.paused
    await update.message.reply_text("⏸ Paused" if job.paused else "▶️ Resumed")


@admin_only
async def cmd_stop(update, context):
    job.running = False
    await update.message.reply_text("⏹ Stop request dewa hoyeche.")


@admin_only
async def cmd_check(update, context):
    if not context.args:
        return await update.message.reply_text("Use: /check 8801712345678")
    n = normalize(context.args[0])
    if not n:
        return await update.message.reply_text("❌ Number thik na.")
    if not any_ready():
        return await update.message.reply_text("⚠️ WhatsApp connected na.")
    try:
        st = await asyncio.to_thread(wa_check, n)
        set_result(n, st)
        await update.message.reply_text(
            f"<code>{n}</code> ➜ {'✅ Registered' if st == 'registered' else '❌ Unregistered'}")
    except Exception as e:
        await update.message.reply_text(f"⚠️ Error: {esc(str(e))}")


@admin_only
async def cmd_results(update, context):
    t, kb = results_view()
    await update.message.reply_text(t, reply_markup=kb)


@admin_only
async def cmd_retry(update, context):
    await update.message.reply_text(do_retry())


@admin_only
async def cmd_logs(update, context):
    await update.message.reply_text(logs_text())


@admin_only
async def cmd_settings(update, context):
    t, kb = settings_view()
    await update.message.reply_text(t, reply_markup=kb)


@admin_only
async def cmd_setdelay(update, context):
    try:
        lo, hi = float(context.args[0]), float(context.args[1])
        assert 1 <= lo <= hi
    except Exception:
        return await update.message.reply_text("Use: /setdelay 4 9  (min 1 ba beshi, max min er soman ba beshi)")
    cfg["min_delay"], cfg["max_delay"] = lo, hi
    save_cfg()
    await update.message.reply_text(f"✅ Delay: {lo:g}–{hi:g}s")


@admin_only
async def cmd_setmax(update, context):
    try:
        n = int(context.args[0])
        assert n >= 1
    except Exception:
        return await update.message.reply_text("Use: /setmax 200")
    cfg["max_per_run"] = n
    save_cfg()
    await update.message.reply_text(f"✅ Max per run: {n}")


@admin_only
async def cmd_setcc(update, context):
    if not context.args:
        return await update.message.reply_text("Use: /setcc 880  ba  /setcc off")
    v = context.args[0].lower()
    cfg["default_cc"] = "" if v == "off" else re.sub(r"\D", "", v)
    save_cfg()
    await update.message.reply_text(f"✅ Default country code: {cfg['default_cc'] or 'off'}")


@admin_only
async def cmd_admins(update, context):
    t, kb = admins_view()
    await update.message.reply_text(t, reply_markup=kb)


@admin_only
async def cmd_addadmin(update, context):
    if not context.args or not context.args[0].isdigit():
        return await update.message.reply_text("Use: /addadmin 123456789")
    aid = int(context.args[0])
    if aid in cfg["admins"]:
        return await update.message.reply_text("Already admin.")
    cfg["admins"].append(aid)
    save_cfg()
    await update.message.reply_text(f"✅ Admin added: <code>{aid}</code>")


@admin_only
async def cmd_removeadmin(update, context):
    if update.effective_user.id != cfg["admins"][0]:
        return await update.message.reply_text("⛔ Shudhu owner admin remove korte pare.")
    if not context.args or not context.args[0].isdigit():
        return await update.message.reply_text("Use: /removeadmin 123456789")
    aid = int(context.args[0])
    if aid == cfg["admins"][0]:
        return await update.message.reply_text("Owner ke remove kora jabe na.")
    if aid not in cfg["admins"]:
        return await update.message.reply_text("Ei ID admin list e nai.")
    cfg["admins"].remove(aid)
    save_cfg()
    await update.message.reply_text(f"✅ Removed: <code>{aid}</code>")


@admin_only
async def cmd_clearresults(update, context):
    if not context.args or context.args[0] != "confirm":
        return await update.message.reply_text("Sure? Likho: /clearresults confirm")
    results.clear()
    rewrite_results()
    await update.message.reply_text("🗑 Sob result delete hoyeche.")


EMOJI_HELP = (
    "💎 <b>Premium Emoji Setup</b>\n"
    "Shorto: bot er <b>owner</b> er Telegram Premium thakte hobe (private chat e kaj kore).\n\n"
    "<b>1) Pack:</b> pack er link pathao, jemon <code>https://t.me/addemoji/PackName</code>\n"
    "Bot pack theke nijei emoji gulo map kore nebe (ekshathe onek pack link dewa jay).\n\n"
    "<b>2) Single emoji:</b> premium emoji pathao. Normal emoji + premium emoji ekshathe dile oita-i map hoy:\n"
    "<code>✅ [premium] ❌ [premium] ⚠️ [premium]</code>\n"
    "Shudhu premium emoji pathale tar nijer base emoji map hoy.\n\n"
    "<b>3)</b> Sob kichu button diye: /emoji ➜ 💎 Emoji Manager\n"
    "/emoji on · /emoji off · /emoji clear")

PACK_ASK = ("📦 <b>Add Emoji Pack</b>\nPack er link (ba shudhu pack er naam) pathao. Ekshathe onek link-o dite paro:\n"
            "<code>https://t.me/addemoji/PackName</code>\nCancel: /cancel")
EMOJI_ASK = ("➕ <b>Add Premium Emoji</b>\nPremium emoji gulo pathao (jotogulo khushi, ekta message e).\n"
             "Normal emoji + premium emoji pathale oita-i map hoy: <code>✅ [premium]</code>\nCancel: /cancel")


def emoji_status():
    t = PE.table()
    have = [e for e, k in zip(EMOJI_SET, EMOJI_KEYS) if k in t]
    miss = [e for e, k in zip(EMOJI_SET, EMOJI_KEYS) if k not in t]
    if not cfg.get("use_premium", True):
        state = "OFF"
    elif PE.broken:
        state = "⚠️ Telegram reject korche, auto-off (/emoji on)"
    elif not t:
        state = "ON (kono emoji map kora nai)"
    else:
        state = "ON"
    return (f"💎 <b>Premium Emoji: {state}</b>\n{LINE}\n"
            f"Mapped ({len(have)}): {' '.join(have) or '—'}\n"
            f"Baki ({len(miss)}): {' '.join(miss) or '—'}")


def emoji_view():
    packs = cfg.get("emoji_packs") or {}
    on = cfg.get("use_premium", True)
    plist = "\n".join(f"📦 <code>{esc(n)}</code> · {len(p.get('map', {}))} emoji" for n, p in packs.items()) or "Kono pack add kora nai"
    text = (emoji_status() + f"\n{LINE}\n📚 <b>Packs</b> ({len(packs)})\n{plist}\n\n"
            "ℹ️ Premium emoji dekhate bot owner er <b>Telegram Premium</b> lagbe. Na thakle normal emoji-i dekhabe.")
    kb = Markup([
        [Btn("➕ Add Pack", callback_data="pe:addpack"), Btn("➕ Add Emoji", callback_data="pe:addemoji")],
        [Btn("📋 Mapped List", callback_data="pe:list"), Btn("🧪 Preview", callback_data="pe:test")],
        [Btn("💎 Premium: " + ("ON" if on else "OFF"), callback_data="pe:toggle"),
         Btn("📚 Packs", callback_data="pe:packs")],
        [Btn("🗑 Remove One", callback_data="pe:rm"), Btn("♻️ Clear All", callback_data="pe:clear")],
        [Btn("⚙️ Settings", callback_data="menu:settings"), Btn("🏠 Menu", callback_data="menu:main")],
    ])
    return text, kb


def emoji_back():
    return [Btn("💎 Emoji Manager", callback_data="menu:emoji")]


def emoji_list_view():
    t = PE.table()
    lines = [f"{k} ➜ <code>{esc(str(v))}</code>" for k, v in t.items()]
    return (f"📋 <b>Mapped Emoji</b> ({len(t)})\n{LINE}\n" + ("\n".join(lines) or "Kichu map kora nai")), Markup([emoji_back()])


def emoji_rm_view():
    t = PE.table()
    keys = list(t)[:40]
    rows, row = [], []
    for k in keys:
        row.append(Btn(k, callback_data=f"pe:del:{k}"))
        if len(row) == 6:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append(emoji_back())
    return (f"🗑 <b>Remove One</b>\n{LINE}\nJeta muchte chao oitar upor chapo:" if keys else "Kichu map kora nai"), Markup(rows)


def packs_view():
    packs = cfg.get("emoji_packs") or {}
    names = list(packs)
    lines = [f"{i + 1}. <b>{esc(p.get('title', n))}</b> · <code>{esc(n)}</code> · "
             f"{len(p.get('map', {}))}/{p.get('total', '?')} match" for i, (n, p) in enumerate(packs.items())]
    rows = []
    for i, n in enumerate(names[:10]):
        rows.append([Btn(f"🔄 Sync {i + 1}", callback_data=f"pe:sp:{i}"), Btn(f"🗑 Remove {i + 1}", callback_data=f"pe:dp:{i}")])
    rows.append([Btn("➕ Add Pack", callback_data="pe:addpack")])
    rows.append(emoji_back())
    return (f"📚 <b>Emoji Packs</b> ({len(packs)})\n{LINE}\n" + ("\n".join(lines) or "Kono pack add kora nai")), Markup(rows)


async def import_pack(bot, name):
    """Custom emoji pack theke bot er emoji gulor sathe match kore map kore. Return (title, got, total)."""
    ss = await bot.get_sticker_set(name)
    if str(getattr(ss, "sticker_type", "custom_emoji")) != "custom_emoji":
        raise ValueError("Eta custom (premium) emoji pack na, normal sticker pack.")
    got = {}
    for st in ss.stickers:
        cid = getattr(st, "custom_emoji_id", None)
        key = norm_key(st.emoji or "")
        if cid and key in EMOJI_KEYS and key not in got:
            got[key] = str(cid)
    if not got:
        return ss.title, got, len(ss.stickers)
    if not isinstance(cfg.get("emoji_packs"), dict):
        cfg["emoji_packs"] = {}
    cfg["emoji_packs"][name] = {"title": ss.title, "map": got, "total": len(ss.stickers)}
    apply_emoji_map(got)   # save_cfg() o kore
    return ss.title, got, len(ss.stickers)


def remove_pack(name):
    p = (cfg.get("emoji_packs") or {}).pop(name, None)
    t = PE.table()
    n = 0
    for k, v in (p or {}).get("map", {}).items():
        if t.get(k) == v:
            t.pop(k, None)
            n += 1
    for other in (cfg.get("emoji_packs") or {}).values():   # baki pack theke removed emoji gulo phire boshao
        for k, v in other.get("map", {}).items():
            t.setdefault(k, v)
    save_cfg()
    return n


@admin_only
async def cmd_emoji(update, context):
    arg = context.args[0].lower() if context.args else ""
    if arg == "on":
        cfg["use_premium"] = True
        PE.broken, PE.strikes = False, 0
        save_cfg()
    elif arg == "off":
        cfg["use_premium"] = False
        save_cfg()
    elif arg == "clear":
        cfg["premium_emoji"] = {}
        cfg["emoji_packs"] = {}
        save_cfg()
    t, kb = emoji_view()
    await update.message.reply_text(t, reply_markup=kb)


@admin_only
async def cmd_setemoji(update, context):
    pairs = pairs_from_message(update.message, skip_command=True)
    if not pairs:
        return await update.message.reply_text(EMOJI_HELP)
    apply_emoji_map(dict(pairs))
    await update.message.reply_text(f"✅ <b>{len(pairs)}</b> ta emoji save holo.\n\n" + emoji_status(),
                                    reply_markup=Markup([emoji_back()]))


PACK_RE = re.compile(r"(?:https?://)?t\.me/addemoji/([A-Za-z0-9_]+)")


async def map_pack(update, context, name):
    wait = await update.message.reply_text(f"⏳ <code>{esc(name)}</code> pack porchi…")
    try:
        title, got, total = await import_pack(context.bot, name)
    except Exception as e:
        return await wait.edit_text(f"❌ <code>{esc(name)}</code>: {esc(str(e))}")
    if not got:
        return await wait.edit_text(
            f"⚠️ <b>{esc(title)}</b> ({total} ta) e bot er emoji gulor kono match paini. Onno pack try koro ba single emoji pathao.")
    await wait.edit_text(f"✅ <b>{esc(title)}</b> theke <b>{len(got)}</b>/{total} ta emoji map holo.\n\n" + emoji_status(),
                         reply_markup=Markup([emoji_back()]))


@admin_only
async def cmd_emojipack(update, context):
    names = PACK_RE.findall(" ".join(context.args or []))
    if not names:
        return await update.message.reply_text("Use: /emojipack https://t.me/addemoji/PackName (ekadhik link dewa jay)")
    for n in dict.fromkeys(names):
        await map_pack(update, context, n)


async def emoji_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    if q.from_user.id not in cfg["admins"]:
        return await q.answer("⛔ Tumi admin na", show_alert=True)
    d = q.data.split(":")
    a = d[1]
    chat_id = q.message.chat_id
    toast = None
    packs = cfg.get("emoji_packs") or {}

    if a == "toggle":
        cfg["use_premium"] = not cfg.get("use_premium", True)
        PE.broken, PE.strikes = False, 0
        save_cfg()
        await edit_cb(q, *emoji_view())
        toast = "💎 " + ("ON" if cfg["use_premium"] else "OFF")
    elif a == "addpack":
        context.user_data["await_pack"] = True
        await context.bot.send_message(chat_id, PACK_ASK)
    elif a == "addemoji":
        context.user_data["await_emoji"] = True
        await context.bot.send_message(chat_id, EMOJI_ASK)
    elif a == "list":
        await edit_cb(q, *emoji_list_view())
    elif a == "test":
        keys = list(PE.table())
        if not keys:
            toast = "Age emoji add koro"
        else:
            note = "" if PE.active() else "\n⚠️ Premium ekhon OFF/inactive, normal emoji dekhabe."
            await context.bot.send_message(chat_id, "🧪 <b>Preview</b>\n" + " ".join(keys) + note)
    elif a == "rm":
        await edit_cb(q, *emoji_rm_view())
    elif a == "del":
        key = ":".join(d[2:])
        PE.table().pop(key, None)
        save_cfg()
        await edit_cb(q, *emoji_rm_view())
        toast = "🗑 Removed"
    elif a == "packs":
        await edit_cb(q, *packs_view())
    elif a in ("sp", "dp"):
        names = list(packs)
        i = int(d[2]) if len(d) > 2 and d[2].isdigit() else -1
        if not 0 <= i < len(names):
            toast = "Pack pawa jayni"
        elif a == "dp":
            n = remove_pack(names[i])
            await edit_cb(q, *packs_view())
            toast = f"🗑 Pack removed ({n} emoji)"
        else:
            try:
                _, got, _ = await import_pack(context.bot, names[i])
                toast = f"🔄 {len(got)} emoji sync holo"
            except Exception as e:
                toast = f"❌ {str(e)[:150]}"
            await edit_cb(q, *packs_view())
    elif a == "clear":
        await edit_cb(q, f"♻️ Sob <b>{len(PE.table())}</b> ta emoji ar <b>{len(packs)}</b> ta pack muche felbe. Sure?",
                      confirm_kb("pe:clearyes", "menu:emoji"))
    elif a == "clearyes":
        cfg["premium_emoji"] = {}
        cfg["emoji_packs"] = {}
        save_cfg()
        await edit_cb(q, *emoji_view())
        toast = "♻️ Cleared"
    await q.answer(toast or "")


def after_add_kb():
    return Markup([[Btn("▶️ Start", callback_data="act:run"), Btn("🏠 Menu", callback_data="menu:main")]])


@admin_only
async def on_text(update, context):
    text = update.message.text or ""
    slot = context.user_data.pop("await_pair", False)
    if slot:
        return await handle_pair(update, context, text, 1 if slot is True else int(slot))
    awaiting_pack = context.user_data.pop("await_pack", False)
    awaiting_emoji = context.user_data.get("await_emoji", False)
    names = list(dict.fromkeys(PACK_RE.findall(text)))   # custom emoji pack link (ekadhik hole o)
    if not names and awaiting_pack and re.fullmatch(r"[A-Za-z0-9_]{3,}", text.strip()):
        names = [text.strip()]
    if names:
        for n in names:
            await map_pack(update, context, n)
        return
    if awaiting_pack:
        context.user_data["await_pack"] = True
        return await update.message.reply_text(
            "❌ Pack link bujhini. Format: <code>https://t.me/addemoji/PackName</code>\nCancel: /cancel")
    if has_custom_emoji(update.message):   # premium emoji pathale map hoy, number hishebe na
        pairs = pairs_from_message(update.message)
        if pairs:
            context.user_data.pop("await_emoji", None)
            apply_emoji_map(dict(pairs))
            return await update.message.reply_text(
                f"✅ <b>{len(pairs)}</b> ta emoji save holo.\n\n" + emoji_status(), reply_markup=Markup([emoji_back()]))
    if awaiting_emoji:
        return await update.message.reply_text("⚠️ Premium emoji paini. Premium emoji pathao ba /cancel")
    added, skipped = add_numbers(text)
    await update.message.reply_text(
        f"➕ Added <b>{added}</b> · Skipped <b>{skipped}</b>\nQueue: <code>{len(queue)}</code>",
        reply_markup=after_add_kb())


@admin_only
async def on_document(update, context):
    doc = update.message.document
    if doc.file_size and doc.file_size > 5 * 1024 * 1024:
        return await update.message.reply_text("❌ File 5MB er beshi.")
    f = await doc.get_file()
    text = bytes(await f.download_as_bytearray()).decode("utf-8", errors="ignore")
    added, skipped = add_numbers(text)
    await update.message.reply_text(
        f"📄 File theke Added <b>{added}</b> · Skipped <b>{skipped}</b>\nQueue: <code>{len(queue)}</code>",
        reply_markup=after_add_kb())


# ======================= Callback buttons =======================
async def edit_cb(q, text, kb=None):
    try:
        if q.message.photo:
            await q.message.reply_text(text, reply_markup=kb)
        else:
            await q.edit_message_text(text, reply_markup=kb)
    except BadRequest as e:
        if "not modified" not in str(e).lower():
            raise


def confirm_kb(yes, no="menu:main"):
    return Markup([[Btn("✅ Haa", callback_data=yes), Btn("❌ Na", callback_data=no)]])


async def on_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    head = q.data.split(":")[0]
    if head == "req":                       # notun user: access request
        return await cb_request(update, context)
    if head in ("mm", "ar"):                # owner: members management / request approve
        if not is_owner(q.from_user.id):
            return await q.answer("👑 Eta shudhu owner er jonno", show_alert=True)
        return await owner_cb(update, context)
    if head == "u":                         # member er alada panel
        return await member_cb(update, context)
    if q.from_user.id not in cfg["admins"]:
        return await q.answer("⛔ Tumi admin na", show_alert=True)
    d = q.data.split(":")
    chat_id = q.message.chat_id
    toast = None

    if d[0] == "pe":
        return await emoji_cb(update, context)
    if d[0] == "mt":
        return await maint_cb(update, context)
    if d[0] == "menu":
        if d[1] == "main":
            await edit_cb(q, dashboard_text(), main_kb())
        elif d[1] == "connect":
            await edit_cb(q, *connect_view())
        elif d[1] == "settings":
            await edit_cb(q, *settings_view())
        elif d[1] == "results":
            await edit_cb(q, *results_view())
        elif d[1] == "admins":
            await edit_cb(q, *admins_view())
        elif d[1] == "add":
            await edit_cb(q, ADD_TEXT, Markup([back_row()]))
        elif d[1] == "emoji":
            await edit_cb(q, *emoji_view())
        elif d[1] == "members":
            if is_owner(q.from_user.id):
                await edit_cb(q, *members_view())
            else:
                toast = "👑 Eta shudhu owner er jonno"

    elif d[0] == "act":
        if d[1] == "run":
            toast = start_job(context.application, chat_id)
            if not toast:
                return await q.answer("▶️ Shuru!")
        elif d[1] == "pause":
            if job.running:
                job.paused = not job.paused
                toast = "⏸ Paused" if job.paused else "▶️ Resumed"
            else:
                toast = "Kono job cholche na"
        elif d[1] == "stop":
            job.running = False
            toast = "⏹ Stop kora hocche…"
        elif d[1] == "retry":
            toast = do_retry()
        elif d[1] == "clearq":
            await edit_cb(q, f"🗑 Queue te <b>{len(queue)}</b> ta number ache. Clear korbe?", confirm_kb("act:clearq_yes"))
        elif d[1] == "clearq_yes":
            queue.clear()
            save_queue()
            await edit_cb(q, dashboard_text(), main_kb())
            toast = "🗑 Queue clear"
        elif d[1] == "logs":
            await context.bot.send_message(chat_id, logs_text())

    elif d[0] == "conn":
        act = d[1]
        slot = int(d[2]) if len(d) > 2 and d[2].isdigit() else 1
        s = SESSIONS.get(slot)
        if act == "qr":
            if s is None:
                toast = "Session nai"
            elif s.status == "ready":
                toast = f"✅ #{slot} already connected"
            elif not s.qr_png:
                toast = "QR toiri hoyni, 5-10 sec por abar dao"
            else:
                await send_qr(chat_id, s)
        elif act == "pair":
            if s is None:
                toast = "Session nai"
            elif s.status == "ready":
                toast = f"✅ #{slot} already connected"
            else:
                context.user_data["await_pair"] = slot
                await context.bot.send_message(
                    chat_id, f"📞 <b>Pairing Code · Session #{slot}</b>\nWhatsApp number pathao (country code shoho), "
                             "jemon <code>8801712345678</code>\nCancel: /cancel")
        elif act == "reset":
            await edit_cb(q, f"♻️ <b>Reset Session #{slot}</b>\nEi WhatsApp session logout hobe, file muche jabe ar bot restart hobe "
                             "(onno session er login thakbe). Tarpor notun kore QR/Pairing code diye link korte hobe.\n\nSure?",
                          confirm_kb(f"conn:reset_yes:{slot}", "menu:connect"))
        elif act == "reset_yes":
            job.running = False
            await edit_cb(q, "♻️ Restart hocche… 10-15 sec por /menu dao.")
            await asyncio.sleep(1)
            return reset_session_and_restart(slot)
        elif act == "add":
            n = wa_slots()
            if n >= MAX_SESSIONS:
                toast = f"Maximum {MAX_SESSIONS} ta session"
            else:
                cfg["wa_slots"] = n + 1
                save_cfg()
                await asyncio.to_thread(ensure_sessions)
                await edit_cb(q, *connect_view())
                toast = f"➕ Session #{n + 1} shuru, QR ashche…"
        elif act == "del":
            n = wa_slots()
            if n <= 1:
                toast = "Komporkhe 1 ta session thakte hobe"
            else:
                await edit_cb(q, f"➖ <b>Remove Session #{n}</b>\nWhatsApp logout hobe ar session file delete hobe.\n\nSure?",
                              confirm_kb("conn:del_yes", "menu:connect"))
        elif act == "del_yes":
            n = wa_slots()
            if n > 1:
                cfg["wa_slots"] = n - 1
                save_cfg()
                await asyncio.to_thread(ensure_sessions)
                toast = f"➖ Session #{n} removed"
            await edit_cb(q, *connect_view())

    elif d[0] == "set":
        if d[1] == "delay":
            cfg["min_delay"], cfg["max_delay"] = float(d[2]), float(d[3])
        elif d[1] == "max":
            cfg["max_per_run"] = int(d[2])
        elif d[1] == "cc":
            cfg["default_cc"] = "" if d[2] == "off" else d[2]
        elif d[1] == "pe":
            cfg["use_premium"] = not cfg.get("use_premium", True)
            PE.broken, PE.strikes = False, 0
        save_cfg()
        await edit_cb(q, *settings_view())
        toast = "✅ Saved"

    elif d[0] == "res":
        if d[1] in ("lreg", "lunreg", "lerr", "lcsv"):
            rid = d[2] if len(d) > 2 else ""
            if rid and rid != str(job.run_id):
                return await q.answer("⚠️ Ei button purano run er. 📊 Results theke notun run er file nao.",
                                      show_alert=True)
            kind = d[1][1:]   # reg | unreg | err | csv
            base = {"reg": "registered", "unreg": "unregistered", "err": "errors", "csv": "results"}[kind]
            name = f"{base}_{run_stamp()}" + (".csv" if kind == "csv" else ".txt")
            await send_file(context.bot, chat_id, name, result_lines(kind, "last"))
        elif d[1] == "csv":   # all-time backup (alada, sudhu backup er jonno)
            await send_file(context.bot, chat_id, "all_results_backup.csv", result_lines("csv", "all"))
        elif d[1] in ("reg", "unreg"):
            toast = "Ei option ar nai. Shudhu last run er file ashe."
        elif d[1] == "clear":
            await edit_cb(q, f"🗑 Sob <b>{len(results)}</b> ta result delete hobe. Sure?",
                          confirm_kb("res:clear_yes", "menu:results"))
        elif d[1] == "clear_yes":
            results.clear()
            rewrite_results()
            await edit_cb(q, *results_view())
            toast = "🗑 Cleared"

    await q.answer(toast or "")


# ======================= 👤 MEMBER PANEL (member der alada system) =======================
def m_main_kb(j):
    pause_lbl = "▶️ Resume" if j.paused else "⏸ Pause"
    return Markup([
        [Btn("▶️ Start", callback_data="u:run"), Btn(pause_lbl, callback_data="u:pause"),
         Btn("⏹ Stop", callback_data="u:stop")],
        [Btn("➕ Add Numbers", callback_data="u:add"), Btn("📊 My Results", callback_data="u:results")],
        [Btn("📈 My Usage", callback_data="u:usage"), Btn("🔁 Retry Errors", callback_data="u:retry")],
        [Btn("🗑 Clear Queue", callback_data="u:clearq"), Btn("🔄 Refresh", callback_data="u:main")],
    ])


def m_back_row():
    return [Btn("🏠 Menu", callback_data="u:main")]


def m_after_add_kb():
    return Markup([[Btn("▶️ Start", callback_data="u:run"), Btn("🏠 Menu", callback_data="u:main")]])


def m_quota_text(m):
    lim, used = m_limit(m), m_used(m)
    if not lim:
        return f"<b>{used}</b> · ♾ Unlimited"
    return f"<b>{used}</b>/{lim} · baki <b>{max(0, lim - used)}</b>"


def m_dashboard_text(uid):
    st, m = get_store(uid), (mem(uid) or {})
    c = st.counts()
    tot = c["registered"] + c["unregistered"]
    hit = f"{c['registered'] * 100 // tot}%" if tot else "—"
    svc = "🟢 Online" if any_ready() else "🔴 Offline"
    return (f"📡 <b>WA Number Checker</b> · 👤 Member\n{LINE}\n"
            f"<b>Service</b>  {svc}\n<b>Job</b>  {job_state(st.job)}\n<b>Queue</b>  <code>{len(st.queue)}</code>\n{LINE}\n"
            f"📅 Aaj: {m_quota_text(m)}\n⏳ Validity: {fmt_expiry(m)}\n{LINE}\n"
            f"✅ Registered     <b>{c['registered']}</b>\n"
            f"❌ Unregistered   <b>{c['unregistered']}</b>\n"
            f"⚠️ Error          <b>{c['error']}</b>\n"
            f"📈 Hit rate       <b>{hit}</b>  ·  Total <b>{len(st.results)}</b>")


M_ADD_TEXT = (f"➕ <b>Numbers Add</b>\n{LINE}\n"
              "• Number paste koro (ekta line e ekta, ba comma diye)\n"
              "• Ba <b>.txt / .csv</b> file pathao\n"
              "• Country code shoho dao (8801712345678)\n\n"
              "Duplicate, invalid ar age check kora number auto skip hoy.\n"
              "Tarpor ▶️ Start chapo.")


def m_results_view(store):
    c = store.counts()
    lr = {"registered": 0, "unregistered": 0, "error": 0}
    for _, st in store.last_run:
        if st in lr:
            lr[st] += 1
    text = (f"📊 <b>My Results</b>\n{LINE}\n"
            f"🆕 <b>Last run</b> ({len(store.last_run)} ta)\n"
            f"✅ {lr['registered']}  ❌ {lr['unregistered']}  ⚠️ {lr['error']}\n\n"
            f"📚 <b>All time</b> ({len(store.results)} ta)\n"
            f"✅ {c['registered']}  ❌ {c['unregistered']}  ⚠️ {c['error']}\n\n"
            "📥 .txt / .csv file e shudhu <b>last run</b> er data ashe. Tomar data shudhu tumi-i dekhte paro.")
    rid = store.job.run_id
    kb = Markup([
        [Btn("📥 Registered", callback_data=f"u:res:reg:{rid}"), Btn("📥 Unregistered", callback_data=f"u:res:unreg:{rid}")],
        [Btn("📥 Errors", callback_data=f"u:res:err:{rid}"), Btn("📥 Last run CSV", callback_data=f"u:res:csv:{rid}")],
        [Btn("💾 All-time CSV", callback_data="u:res:all:0"), Btn("🗑 Clear Results", callback_data="u:clearres")],
        m_back_row(),
    ])
    return text, kb


def m_usage_view(uid):
    m = mem(uid) or {}
    st = get_store(uid)
    lim = m_limit(m)
    text = (f"📈 <b>My Usage</b>\n{LINE}\n"
            f"📅 Aaj: {m_quota_text(m)}\n"
            f"🔢 Daily limit: <b>{lim or '♾ Unlimited'}</b>\n"
            f"📦 Per run: <b>{m_max_run(m)}</b>\n"
            f"🗂 Queue limit: <b>{mdef('max_queue')}</b> (ekhon {len(st.queue)})\n"
            f"📚 Total checked: <b>{int(m.get('total', 0))}</b>\n"
            f"⏳ Validity: <b>{fmt_expiry(m)}</b>\n\n"
            "🕛 Daily limit proti din auto reset hoy.")
    return text, Markup([m_back_row()])


MEMBER_HELP = (f"ℹ️ <b>Member Help</b>\n{LINE}\n"
               "➕ Number paste/file pathao ➜ queue e jabe\n"
               "▶️ <b>Start</b> ➜ check shuru (WhatsApp shared, tai onno job thakle line e thakbe)\n"
               "📊 Result file shudhu tomar nijer\n\n"
               "/menu · /run · /pause · /stop · /check 8801712345678\n"
               "/results · /usage · /retry · /cancel")


def m_retry(store):
    errs = [n for n, s in store.results.items() if s == "error"]
    for n in errs:
        store.results.pop(n, None)
    store.rewrite_results()
    added, _ = store.add_numbers("\n".join(errs), mdef("max_queue"))
    return f"🔁 {added} ta error number queue te dewa hoyeche."


async def m_cmd_menu(update, context):
    uid = update.effective_user.id
    await update.message.reply_text(m_dashboard_text(uid), reply_markup=m_main_kb(get_store(uid).job))


async def m_cmd_help(update, context):
    await update.message.reply_text(MEMBER_HELP)


async def m_cmd_cancel(update, context):
    await update.message.reply_text("❎ Cancelled.")


async def m_cmd_run(update, context):
    err = start_job(context.application, update.effective_chat.id, get_store(update.effective_user.id))
    if err:
        await update.message.reply_text(f"⚠️ {err}")


async def m_cmd_pause(update, context):
    j = get_store(update.effective_user.id).job
    if not j.running:
        return await update.message.reply_text("Kono job cholche na.")
    j.paused = not j.paused
    await update.message.reply_text("⏸ Paused" if j.paused else "▶️ Resumed")


async def m_cmd_stop(update, context):
    get_store(update.effective_user.id).job.running = False
    await update.message.reply_text("⏹ Stop request dewa hoyeche.")


async def m_cmd_retry(update, context):
    await update.message.reply_text(m_retry(get_store(update.effective_user.id)))


async def m_cmd_results(update, context):
    t, kb = m_results_view(get_store(update.effective_user.id))
    await update.message.reply_text(t, reply_markup=kb)


async def m_cmd_usage(update, context):
    t, kb = m_usage_view(update.effective_user.id)
    await update.message.reply_text(t, reply_markup=kb)


async def m_cmd_check(update, context):
    uid = update.effective_user.id
    m = mem(uid)
    if not context.args:
        return await update.message.reply_text("Use: /check 8801712345678")
    n = normalize(context.args[0])
    if not n:
        return await update.message.reply_text("❌ Number thik na.")
    if not any_ready():
        return await update.message.reply_text("⚠️ Service ekhon offline. Owner ke janao.")
    left = m_left(m)
    if left is not None and left <= 0:
        return await update.message.reply_text("⛔ Aajker daily limit shesh.")
    now = time.time()
    if now - context.user_data.get("last_check", 0) < 3:
        return await update.message.reply_text("⏳ Ektu pore abar try koro.")
    context.user_data["last_check"] = now
    try:
        st = await asyncio.to_thread(wa_check, n)
    except Exception as e:
        log.warning("member check error: %s", e)
        return await update.message.reply_text("⚠️ Check kora gelo na, pore abar try koro.")
    get_store(uid).set_result(n, st)
    m_bump(uid)
    save_cfg()
    await update.message.reply_text(
        f"<code>{n}</code> ➜ {'✅ Registered' if st == 'registered' else '❌ Unregistered'}")


async def member_text(update, context):
    uid = update.effective_user.id
    store = get_store(uid)
    cap = mdef("max_queue")
    if len(store.queue) >= cap:
        return await update.message.reply_text(
            f"⚠️ Queue full ({cap}). Age ▶️ Start diye check koro.", reply_markup=m_after_add_kb())
    added, skipped = store.add_numbers(update.message.text or "", cap)
    note = "\n⚠️ Queue limit e pouche gechhe." if len(store.queue) >= cap else ""
    await update.message.reply_text(
        f"➕ Added <b>{added}</b> · Skipped <b>{skipped}</b>\nQueue: <code>{len(store.queue)}</code>/{cap}{note}",
        reply_markup=m_after_add_kb())


async def member_doc(update, context):
    uid = update.effective_user.id
    doc = update.message.document
    if doc.file_size and doc.file_size > 2 * 1024 * 1024:
        return await update.message.reply_text("❌ File 2MB er beshi.")
    store = get_store(uid)
    cap = mdef("max_queue")
    f = await doc.get_file()
    text = bytes(await f.download_as_bytearray()).decode("utf-8", errors="ignore")
    added, skipped = store.add_numbers(text, cap)
    note = "\n⚠️ Queue limit e pouche gechhe." if len(store.queue) >= cap else ""
    await update.message.reply_text(
        f"📄 File theke Added <b>{added}</b> · Skipped <b>{skipped}</b>\nQueue: <code>{len(store.queue)}</code>/{cap}{note}",
        reply_markup=m_after_add_kb())


async def member_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    uid = q.from_user.id
    if member_state(uid) != "active":
        return await q.answer("⛔ Tomar access active na", show_alert=True)
    if maint_on():
        return await q.answer("🛠 Bot ekhon maintenance e ache. Kichukkhon por abar try koro.", show_alert=True)
    d = q.data.split(":")[1:]
    store = get_store(uid)
    j = store.job
    chat_id = q.message.chat_id
    toast = None
    a = d[0] if d else "main"

    if a == "main":
        await edit_cb(q, m_dashboard_text(uid), m_main_kb(j))
    elif a == "add":
        await edit_cb(q, M_ADD_TEXT, Markup([m_back_row()]))
    elif a == "results":
        await edit_cb(q, *m_results_view(store))
    elif a == "usage":
        await edit_cb(q, *m_usage_view(uid))
    elif a == "run":
        toast = start_job(context.application, chat_id, store)
        if not toast:
            return await q.answer("▶️ Shuru!")
    elif a == "pause":
        if j.running:
            j.paused = not j.paused
            toast = "⏸ Paused" if j.paused else "▶️ Resumed"
        else:
            toast = "Kono job cholche na"
    elif a == "stop":
        j.running = False
        toast = "⏹ Stop kora hocche…"
    elif a == "retry":
        toast = m_retry(store)
    elif a == "clearq":
        await edit_cb(q, f"🗑 Queue te <b>{len(store.queue)}</b> ta number ache. Clear korbe?",
                      confirm_kb("u:clearq_yes", "u:main"))
    elif a == "clearq_yes":
        store.queue.clear()
        store.save_queue()
        await edit_cb(q, m_dashboard_text(uid), m_main_kb(j))
        toast = "🗑 Queue clear"
    elif a == "clearres":
        await edit_cb(q, f"🗑 Tomar sob <b>{len(store.results)}</b> ta result delete hobe. Sure?",
                      confirm_kb("u:clearres_yes", "u:results"))
    elif a == "clearres_yes":
        store.results.clear()
        store.rewrite_results()
        await edit_cb(q, *m_results_view(store))
        toast = "🗑 Cleared"
    elif a == "res":
        kind, rid = d[1], (d[2] if len(d) > 2 else "")
        if kind == "all":
            await send_file(context.bot, chat_id, "all_results_backup.csv", result_lines("csv", "all", store))
        elif kind in ("reg", "unreg", "err", "csv"):
            if rid and rid != str(j.run_id):
                return await q.answer("⚠️ Ei button purano run er. 📊 My Results theke notun file nao.",
                                      show_alert=True)
            base = {"reg": "registered", "unreg": "unregistered", "err": "errors", "csv": "results"}[kind]
            name = f"{base}_{run_stamp(j)}" + (".csv" if kind == "csv" else ".txt")
            await send_file(context.bot, chat_id, name, result_lines(kind, "last", store))

    await q.answer(toast or "")


# ======================= 🙋 Access request (notun user -> owner approve) =======================
async def cb_request(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    u = q.from_user
    st = member_state(u.id)
    if is_admin(u.id) or st == "active":
        return await q.answer("Tomar already access ache. /menu", show_alert=True)
    if st in ("blocked", "banned"):
        return await q.answer("⛔ Access nai", show_alert=True)
    if not cfg.get("accept_requests", True):
        return await q.answer("Ekhon notun request newa hocche na", show_alert=True)
    if str(u.id) in cfg["pending"]:
        return await q.answer("⏳ Request already pathano ache", show_alert=True)
    cfg["pending"][str(u.id)] = {"name": u.full_name or str(u.id), "username": u.username or "", "ts": int(time.time())}
    save_cfg()
    await q.answer("✅ Request pathano hoyeche")
    await edit_cb(q, f"✅ <b>Request pathano hoyeche</b>\nOwner approve korle ekhane jante parbe.\nID: <code>{u.id}</code>")
    uname = f" · @{esc(u.username)}" if u.username else ""
    try:
        await context.bot.send_message(
            cfg["admins"][0],
            f"🙋 <b>Access Request</b>\n{LINE}\n👤 {esc(u.full_name or '')}{uname}\nID: <code>{u.id}</code>",
            reply_markup=Markup([[Btn("✅ Approve", callback_data=f"ar:ok:{u.id}"),
                                  Btn("❌ Reject", callback_data=f"ar:no:{u.id}")],
                                 [Btn("🚫 Block", callback_data=f"ar:blk:{u.id}")]]))
    except Exception as e:
        log.warning("owner notify failed: %s", e)


async def welcome_member(bot, uid):
    m = mem(uid) or {}
    try:
        await bot.send_message(
            uid, f"🎉 <b>Welcome!</b> Tomar access approve hoyeche.\n"
                 f"📅 Daily limit: <b>{m_limit(m) or '♾'}</b> · ⏳ {fmt_expiry(m)}\n\n" + m_dashboard_text(uid),
            reply_markup=m_main_kb(get_store(uid).job))
        return True
    except Exception as e:
        log.warning("welcome to %s failed: %s", uid, e)
        return False


# ======================= 👑 OWNER: Members management =======================
OWNER_HELP = ("/members · /member ID · /addmember ID [limit] [days]\n"
              "/removemember ID · /ban ID · /unban ID\n"
              "/setlimit ID N (0=unlimited) · /setexpiry ID DAYS (0=none)\n"
              "/memberdefaults DAILY PER_RUN QUEUE · /broadcast text")


def members_line():
    ms = cfg["members"]
    active = sum(1 for k in ms if member_state(int(k)) == "active")
    return f"<b>{active}</b>/{len(ms)} active" + (f" · 🙋 {len(cfg['pending'])} pending" if cfg["pending"] else "")


def sched_line():
    rj = running_jobs()
    if not rj:
        return "💤 Idle"
    if len(rj) == 1:
        cur = rj[0]
        who = "🛡 Admin" if cur.is_admin else f"👤 {esc(mname(cur.uid))}"
        return f"{who} · {cur.job.count}/{cur.job.target}"
    return f"🔄 {len(rj)}ta job ekshathe cholche"


def members_view():
    ms = cfg["members"]
    icon = {"active": "🟢", "banned": "🚫", "expired": "⌛"}
    keys = list(ms)[:20]
    lines = []
    for k in keys:
        m = ms[k]
        lim = m_limit(m)
        lines.append(f"{icon.get(member_state(int(k)), '•')} {esc(m.get('name', k))} · <code>{k}</code> · "
                     f"{m_used(m)}/{lim or '∞'}")
    more = f"\n… +{len(ms) - 20} aro (/member ID)" if len(ms) > 20 else ""
    text = (f"👥 <b>Members</b> · {members_line()}\n{LINE}\n"
            f"⚡ Ekhon: {sched_line()}\n"
            f"🔓 New requests: <b>{'ON' if cfg.get('accept_requests', True) else 'OFF'}</b>\n"
            f"📦 Default: <b>{mdef('daily_limit') or '∞'}</b>/day · <b>{mdef('max_per_run')}</b>/run · "
            f"queue <b>{mdef('max_queue')}</b>\n{LINE}\n"
            + ("\n".join(lines) or "Kono member nai.") + more + f"\n{LINE}\n<code>{esc(OWNER_HELP)}</code>")
    rows, row = [], []
    for k in keys:
        m = ms[k]
        row.append(Btn(f"{icon.get(member_state(int(k)), '•')} {str(m.get('name', k))[:14]}", callback_data=f"mm:v:{k}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([Btn(f"🙋 Pending ({len(cfg['pending'])})", callback_data="mm:pend"),
                 Btn("🔓 Requests: " + ("ON" if cfg.get("accept_requests", True) else "OFF"), callback_data="mm:req")])
    rows.append([Btn("🏠 Menu", callback_data="menu:main")])
    return text, Markup(rows)


def pending_view():
    p = cfg["pending"]
    keys = list(p)[:8]
    lines = [f"• {esc(p[k].get('name', '?'))}" + (f" @{esc(p[k]['username'])}" if p[k].get("username") else "")
             + f" · <code>{k}</code>" for k in keys]
    rows = [[Btn(f"✅ {k}", callback_data=f"ar:ok:{k}"), Btn("❌", callback_data=f"ar:no:{k}"),
             Btn("🚫", callback_data=f"ar:blk:{k}")] for k in keys]
    rows.append([Btn("👥 Members", callback_data="menu:members")])
    return (f"🙋 <b>Pending Requests</b> · {len(p)}\n{LINE}\n" + ("\n".join(lines) or "Kono pending request nai")), Markup(rows)


def member_detail(uid):
    m = mem(uid)
    back = Markup([[Btn("👥 Members", callback_data="menu:members")]])
    if not m:
        return "❌ Ei member pawa jayni.", back
    st = get_store(uid)
    c = st.counts()
    state = {"active": "🟢 Active", "banned": "🚫 Banned", "expired": "⌛ Expired"}.get(member_state(uid), "•")
    banned = bool(m.get("banned"))
    text = (f"👤 <b>{esc(m.get('name', str(uid)))}</b>"
            + (f" · @{esc(m['username'])}" if m.get("username") else "") + f"\nID: <code>{uid}</code>\n{LINE}\n"
            f"Status: <b>{state}</b>\n"
            f"📅 Aaj: {m_quota_text(m)}\n"
            f"📦 Per run: <b>{m_max_run(m)}</b> · Total checked: <b>{int(m.get('total', 0))}</b>\n"
            f"⏳ Validity: <b>{fmt_expiry(m)}</b>\n"
            f"🗂 Queue: <b>{len(st.queue)}</b> · Job: {job_state(st.job)}\n"
            f"✅ {c['registered']}  ❌ {c['unregistered']}  ⚠️ {c['error']}\n"
            f"🆕 Joined: {time.strftime('%d %b %Y', time.localtime(m.get('added', time.time())))}")
    kb = Markup([
        [Btn("✅ Unban" if banned else "🚫 Ban", callback_data=f"mm:{'unban' if banned else 'ban'}:{uid}"),
         Btn("🗑 Remove", callback_data=f"mm:del:{uid}")],
        [Btn("➖ 100", callback_data=f"mm:lim:{uid}:-100"), Btn("➕ 100", callback_data=f"mm:lim:{uid}:100"),
         Btn("♾ Unlimited", callback_data=f"mm:unl:{uid}")],
        [Btn("📅 +7d", callback_data=f"mm:exp:{uid}:7"), Btn("📅 +30d", callback_data=f"mm:exp:{uid}:30"),
         Btn("♾ No expiry", callback_data=f"mm:exp:{uid}:0")],
        [Btn("🔄 Reset today", callback_data=f"mm:reset:{uid}"), Btn("⏹ Stop job", callback_data=f"mm:stop:{uid}")],
        [Btn("👥 Members", callback_data="menu:members")],
    ])
    return text, kb


async def owner_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    d = q.data.split(":")
    toast = None

    if d[0] == "ar":   # access request: ar:ok|no|blk:<uid>
        act, uid = d[1], int(d[2])
        info = cfg["pending"].get(str(uid), {})
        nxt = Markup([[Btn("🙋 Pending", callback_data="mm:pend"), Btn("👥 Members", callback_data="menu:members")]])
        if act == "ok":
            add_member(uid, info.get("name", ""), info.get("username", ""), days=0)
            await edit_cb(q, f"✅ Approved: <b>{esc(mname(uid))}</b> · <code>{uid}</code>", nxt)
            await welcome_member(context.bot, uid)
        elif act == "no":
            cfg["pending"].pop(str(uid), None)
            save_cfg()
            await edit_cb(q, f"❌ Rejected: <code>{uid}</code>", nxt)
            try:
                await context.bot.send_message(uid, "❌ Tomar access request reject kora hoyeche.")
            except Exception:
                pass
        elif act == "blk":
            cfg["pending"].pop(str(uid), None)
            cfg["members"].pop(str(uid), None)
            if uid not in cfg["blocked"]:
                cfg["blocked"].append(uid)
            stop_member_job(uid)
            save_cfg()
            await edit_cb(q, f"🚫 Blocked: <code>{uid}</code>", nxt)
        return await q.answer("")

    a = d[1]   # mm:...
    uid = int(d[2]) if len(d) > 2 and d[2].lstrip("-").isdigit() else None
    m = mem(uid) if uid is not None else None
    if a == "list":
        await edit_cb(q, *members_view())
    elif a == "pend":
        await edit_cb(q, *pending_view())
    elif a == "req":
        cfg["accept_requests"] = not cfg.get("accept_requests", True)
        save_cfg()
        await edit_cb(q, *members_view())
        toast = "🔓 Requests " + ("ON" if cfg["accept_requests"] else "OFF")
    elif m is None:
        toast = "Member pawa jayni"
    elif a == "v":
        await edit_cb(q, *member_detail(uid))
    elif a in ("ban", "unban"):
        m["banned"] = (a == "ban")
        if a == "ban":
            stop_member_job(uid)
        save_cfg()
        await edit_cb(q, *member_detail(uid))
        toast = "🚫 Banned" if a == "ban" else "✅ Unbanned"
    elif a == "del":
        await edit_cb(q, f"🗑 <b>{esc(mname(uid))}</b> (<code>{uid}</code>) ke remove korbe?\n(Tar data file gulo disk e thakbe)",
                      confirm_kb(f"mm:delyes:{uid}", f"mm:v:{uid}"))
    elif a == "delyes":
        stop_member_job(uid)
        cfg["members"].pop(str(uid), None)
        STORES.pop(uid, None)
        save_cfg()
        await edit_cb(q, *members_view())
        toast = "🗑 Removed"
    elif a == "lim":
        base = m_limit(m) or mdef("daily_limit")
        m["daily_limit"] = max(1, base + int(d[3]))
        save_cfg()
        await edit_cb(q, *member_detail(uid))
        toast = f"📅 Daily limit {m['daily_limit']}"
    elif a == "unl":
        m["daily_limit"] = 0
        save_cfg()
        await edit_cb(q, *member_detail(uid))
        toast = "♾ Unlimited"
    elif a == "exp":
        days = int(d[3])
        if days <= 0:
            m["expires"] = 0
        else:
            m["expires"] = int(max(time.time(), m.get("expires", 0)) + days * 86400)
        save_cfg()
        await edit_cb(q, *member_detail(uid))
        toast = "📅 Validity update"
    elif a == "reset":
        m["used"], m["day"] = 0, time.strftime("%Y-%m-%d")
        save_cfg()
        await edit_cb(q, *member_detail(uid))
        toast = "🔄 Aajker usage reset"
    elif a == "stop":
        stop_member_job(uid)
        toast = "⏹ Job stop kora hocche"
    await q.answer(toast or "")


def uid_arg(context):
    a = context.args[0] if context.args else ""
    return int(a) if a.isdigit() else None


@owner_only
async def cmd_members(update, context):
    t, kb = members_view()
    await update.message.reply_text(t, reply_markup=kb)


@owner_only
async def cmd_member(update, context):
    uid = uid_arg(context)
    if uid is None:
        return await update.message.reply_text("Use: /member 123456789")
    t, kb = member_detail(uid)
    await update.message.reply_text(t, reply_markup=kb)


@owner_only
async def cmd_addmember(update, context):
    uid = uid_arg(context)
    if uid is None:
        return await update.message.reply_text("Use: /addmember ID [daily_limit] [days]\nExample: /addmember 123456789 300 30")
    if is_admin(uid):
        return await update.message.reply_text("Ei user already admin.")
    lim = int(context.args[1]) if len(context.args) > 1 and context.args[1].isdigit() else None
    days = int(context.args[2]) if len(context.args) > 2 and context.args[2].isdigit() else None
    name, uname = "", ""
    try:
        ch = await context.bot.get_chat(uid)
        name, uname = ch.full_name or "", ch.username or ""
    except Exception:
        pass
    add_member(uid, name, uname, lim, days)
    ok = await welcome_member(context.bot, uid)
    await update.message.reply_text(
        f"✅ Member added: <code>{uid}</code>" + ("" if ok else "\n⚠️ Take message pathano gelo na (se ekbar bot e /start dile pabe)."))


@owner_only
async def cmd_removemember(update, context):
    uid = uid_arg(context)
    if uid is None or not mem(uid):
        return await update.message.reply_text("Use: /removemember ID (member list e thakte hobe)")
    stop_member_job(uid)
    cfg["members"].pop(str(uid), None)
    STORES.pop(uid, None)
    save_cfg()
    await update.message.reply_text(f"🗑 Removed: <code>{uid}</code>")


@owner_only
async def cmd_ban(update, context):
    uid = uid_arg(context)
    if uid is None or not mem(uid):
        return await update.message.reply_text("Use: /ban ID")
    mem(uid)["banned"] = True
    stop_member_job(uid)
    save_cfg()
    await update.message.reply_text(f"🚫 Banned: <code>{uid}</code>")


@owner_only
async def cmd_unban(update, context):
    uid = uid_arg(context)
    if uid is None:
        return await update.message.reply_text("Use: /unban ID")
    if uid in cfg["blocked"]:
        cfg["blocked"].remove(uid)
    if mem(uid):
        mem(uid)["banned"] = False
    save_cfg()
    await update.message.reply_text(f"✅ Unbanned: <code>{uid}</code>")


@owner_only
async def cmd_setlimit(update, context):
    uid = uid_arg(context)
    if uid is None or not mem(uid) or len(context.args) < 2 or not context.args[1].isdigit():
        return await update.message.reply_text("Use: /setlimit ID N   (N=0 mane unlimited)")
    mem(uid)["daily_limit"] = int(context.args[1])
    save_cfg()
    await update.message.reply_text(f"✅ Daily limit <code>{uid}</code>: {int(context.args[1]) or '♾'}")


@owner_only
async def cmd_setexpiry(update, context):
    uid = uid_arg(context)
    if uid is None or not mem(uid) or len(context.args) < 2 or not context.args[1].isdigit():
        return await update.message.reply_text("Use: /setexpiry ID DAYS   (DAYS=0 mane no expiry)")
    days = int(context.args[1])
    mem(uid)["expires"] = int(time.time() + days * 86400) if days else 0
    save_cfg()
    await update.message.reply_text(f"✅ Validity <code>{uid}</code>: {fmt_expiry(mem(uid))}")


@owner_only
async def cmd_memberdefaults(update, context):
    a = context.args
    if len(a) != 3 or not all(x.isdigit() for x in a) or int(a[1]) < 1 or int(a[2]) < 1:
        return await update.message.reply_text(
            "Use: /memberdefaults DAILY PER_RUN QUEUE\nExample: /memberdefaults 200 100 2000  (DAILY=0 mane unlimited)")
    cfg["member_defaults"] = {"daily_limit": int(a[0]), "max_per_run": int(a[1]), "max_queue": int(a[2])}
    save_cfg()
    await update.message.reply_text(
        f"✅ Member default: {int(a[0]) or '∞'}/day · {a[1]}/run · queue {a[2]}\n(Jader nijer alada limit set kora nai, tader upor apply hobe)")


@owner_only
async def cmd_broadcast(update, context):
    text = re.sub(r"^/\w+(@\w+)?\s*", "", update.message.text or "").strip()
    if not text:
        return await update.message.reply_text("Use: /broadcast tomader message")
    sent = failed = 0
    for k, m in list(cfg["members"].items()):
        if m.get("banned"):
            continue
        try:
            await context.bot.send_message(int(k), f"📢 <b>Owner Notice</b>\n{LINE}\n{esc(text)}")
            sent += 1
        except Exception:
            failed += 1
        await asyncio.sleep(0.05)
    await update.message.reply_text(f"📢 Sent <b>{sent}</b> · Failed <b>{failed}</b>")


# ======================= 🛠 Maintenance mode =======================
# ON hole: member der shob command/button/job block (queue ar data safe thake). Owner/admin normal kaj korte pare.
def maint_on():
    return bool((cfg.get("maintenance") or {}).get("on"))


def maint_badge():
    return "  ·  🛠 <b>Maintenance ON</b>" if maint_on() else ""


def maint_text():
    custom = esc((cfg.get("maintenance") or {}).get("msg", "")) or "Bot update/maintenance cholche."
    return (f"🛠 <b>Bot Maintenance</b>\n{LINE}\n{custom}\n\n"
            "Kichukkhon por abar try koro. Tomar queue ar data safe ache.")


async def notify_members(bot, text):
    for k, m in list(cfg["members"].items()):
        if m.get("banned"):
            continue
        try:
            await bot.send_message(int(k), text)
        except Exception:
            pass
        await asyncio.sleep(0.05)


async def set_maintenance(bot, on, msg=None, notify=True):
    mt = cfg["maintenance"]
    was = bool(mt.get("on"))
    mt["on"] = bool(on)
    if msg is not None:
        mt["msg"] = msg
    if on and not was:
        mt["since"] = int(time.time())
    save_cfg()
    if on:
        for st in list(STORES.values()):   # cholte thaka member job gulo thamao
            st.job.running = False
    if notify and bool(on) != was:
        text = maint_text() if on else "✅ <b>Bot abar chalu hoyeche!</b> Ekhon normal use korte paro. /menu"
        t = asyncio.create_task(notify_members(bot, text))
        TASKS.add(t)
        t.add_done_callback(TASKS.discard)


def maint_status():
    mt = cfg.get("maintenance") or {}
    running = sum(1 for st in STORES.values() if st.job.running)
    if maint_on():
        since = time.strftime("%d %b %H:%M", time.localtime(mt.get("since", time.time())))
        head = f"🛠 <b>Maintenance: ON</b>\nShuru: {since}"
    else:
        head = "🟢 <b>Maintenance: OFF</b>\nBot normal chalche."
    msg = esc(mt.get("msg", "")) or "<i>default message</i>"
    return (f"{head}\n{LINE}\n💬 Message: {msg}\n👥 Active members: <b>{sum(1 for k in cfg['members'] if member_state(int(k)) == 'active')}</b>"
            f" · Running jobs: <b>{running}</b>\n\n"
            "ON korle members der command/button/job block hoy (queue safe thake). Owner/admin normal kaj korte pare.\n"
            "<code>/maintenance on Kichukkhon update cholche</code>\n<code>/maintenance on silent</code> (members ke notify korbe na)\n"
            "<code>/maintenance off</code>")


def maint_kb():
    on = maint_on()
    return Markup([
        [Btn("🟢 Turn OFF" if on else "🛠 Turn ON", callback_data="mt:toggle")],
        [Btn("⚙️ Settings", callback_data="menu:settings"), Btn("🏠 Menu", callback_data="menu:main")],
    ])


@admin_only
async def cmd_maintenance(update, context):
    a = list(context.args or [])
    arg = a[0].lower() if a else ""
    if arg in ("on", "off"):
        rest = a[1:]
        silent = bool(rest) and rest[0].lower() == "silent"
        if silent:
            rest = rest[1:]
        msg = " ".join(rest).strip() if arg == "on" else None
        await set_maintenance(context.bot, arg == "on", msg, notify=not silent)
    await update.message.reply_text(maint_status(), reply_markup=maint_kb())


async def maint_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    d = q.data.split(":")
    toast = None
    if d[1] == "toggle":
        await set_maintenance(context.bot, not maint_on(), None, notify=True)
        toast = "🛠 Maintenance ON" if maint_on() else "🟢 Maintenance OFF"
    await edit_cb(q, maint_status(), maint_kb())
    await q.answer(toast or "")


# ======================= Startup =======================
async def post_init(app):
    global LOOP, APP
    LOOP = asyncio.get_running_loop()
    APP = app
    member_cmds = [
        BotCommand("menu", "Dashboard"), BotCommand("run", "Check shuru"), BotCommand("pause", "Pause/Resume"),
        BotCommand("stop", "Stop"), BotCommand("check", "Ekta number check"), BotCommand("results", "My results"),
        BotCommand("usage", "My usage / limit"), BotCommand("retry", "Error retry"), BotCommand("help", "Help"),
    ]
    admin_cmds = [
        BotCommand("menu", "Dashboard"), BotCommand("qr", "WhatsApp QR code"),
        BotCommand("pair", "Pairing code diye connect"), BotCommand("sessions", "WhatsApp sessions (1-5)"),
        BotCommand("addsession", "Notun session add"), BotCommand("run", "Check shuru"),
        BotCommand("pause", "Pause/Resume"), BotCommand("stop", "Stop"), BotCommand("check", "Ekta number check"),
        BotCommand("results", "Results"), BotCommand("settings", "Settings"), BotCommand("logs", "Logs"),
        BotCommand("members", "Members management"), BotCommand("broadcast", "Members ke message"),
        BotCommand("maintenance", "Maintenance on/off"),
        BotCommand("emoji", "Premium emoji setup"), BotCommand("cancel", "Cancel"),
    ]
    await app.bot.set_my_commands(member_cmds)    # default (member + onno shobar jonno)
    for aid in cfg["admins"]:
        try:
            await app.bot.set_my_commands(admin_cmds, scope=BotCommandScopeChat(aid))
        except Exception as e:
            log.warning("set admin commands %s failed: %s", aid, e)
    for aid in cfg["admins"]:
        try:
            await app.bot.send_message(aid, "🟢 <b>Bot online</b>\n\n" + dashboard_text(), reply_markup=main_kb())
        except Exception as e:
            log.warning("startup msg to %s failed: %s", aid, e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--setup", action="store_true", help="Token ar admin ID abar set koro")
    args = ap.parse_args()

    load_cfg()
    if args.setup or not cfg["bot_token"] or not cfg["admins"]:
        setup_wizard()
    load_data()

    threading.Thread(target=wa_thread, daemon=True).start()

    bot = PEBot(cfg["bot_token"], defaults=Defaults(parse_mode=ParseMode.HTML))
    app = Application.builder().bot(bot).post_init(post_init).build()
    cmds = {
        "start": dual(cmd_menu, m_cmd_menu), "menu": dual(cmd_menu, m_cmd_menu), "help": dual(cmd_menu, m_cmd_help),
        "status": dual(cmd_menu, m_cmd_menu), "qr": cmd_qr, "pair": cmd_pair,
        "sessions": cmd_sessions, "addsession": cmd_addsession, "delsession": cmd_delsession,
        "cancel": dual(cmd_cancel, m_cmd_cancel), "run": dual(cmd_run, m_cmd_run),
        "pause": dual(cmd_pause, m_cmd_pause), "stop": dual(cmd_stop, m_cmd_stop),
        "check": dual(cmd_check, m_cmd_check), "results": dual(cmd_results, m_cmd_results),
        "retry": dual(cmd_retry, m_cmd_retry), "usage": dual(cmd_menu, m_cmd_usage),
        "logs": cmd_logs, "settings": cmd_settings,
        "setdelay": cmd_setdelay, "setmax": cmd_setmax, "setcc": cmd_setcc, "admins": cmd_admins,
        "addadmin": cmd_addadmin, "removeadmin": cmd_removeadmin, "clearresults": cmd_clearresults,
        "emoji": cmd_emoji, "setemoji": cmd_setemoji, "emojipack": cmd_emojipack,
    }
    cmds.update({"maintenance": cmd_maintenance, "maint": cmd_maintenance})
    cmds.update({   # 👑 owner-only: members management
        "members": cmd_members, "member": cmd_member, "addmember": cmd_addmember,
        "removemember": cmd_removemember, "ban": cmd_ban, "unban": cmd_unban, "setlimit": cmd_setlimit,
        "setexpiry": cmd_setexpiry, "memberdefaults": cmd_memberdefaults, "broadcast": cmd_broadcast,
    })
    for name, fn in cmds.items():
        app.add_handler(CommandHandler(name, fn))
    app.add_handler(CallbackQueryHandler(on_cb))
    app.add_handler(MessageHandler(filters.Document.ALL, dual(on_document, member_doc)))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, dual(on_text, member_text)))

    log.info("Bot cholche... Ctrl+C diye bondho koro")
    app.run_polling()


if __name__ == "__main__":
    main()
