import os
import sys
import json
import urllib.request
import urllib.parse

# Ensure console utf-8 safe printing on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def send_telegram(message: str, bot_token: str = None, chat_id: str = None) -> bool:
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = chat_id or os.environ.get("TELEGRAM_CHAT_ID")
    
    # Check config file if env vars not set
    config_path = os.path.join(os.path.dirname(__file__), "telegram_config.json")
    if (not token or not chat) and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                token = token or data.get("bot_token")
                chat = chat or data.get("chat_id")
        except Exception as e:
            print(f"Error reading telegram_config.json: {e}")

    if not token or not chat:
        print("[!] Telegram config missing: token or chat_id.")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": str(chat),
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json; charset=utf-8"})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                print("[OK] Telegram message sent successfully!")
                return True
            else:
                print(f"[ERR] Telegram HTTP status: {response.status}")
                return False
    except Exception as e:
        print(f"[ERR] Telegram send error: {e}")
        return False

if __name__ == "__main__":
    test_msg = sys.argv[1] if len(sys.argv) > 1 else "[인터피아드] 텔레그램 알림 테스트 성공!"
    send_telegram(test_msg)
