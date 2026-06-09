import time
import random
from supabase import create_client, Client

SUPABASE_URL = "ТВОЙ_SUPABASE_URL"
SUPABASE_KEY = "ТВОЙ_SUPABASE_ANON_KEY"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ROUND_TIME = 30 # Время раунда в секундах

def run_game_loop():
    print("🤖 Сервер рулетки запущен и управляет игрой...")
    
    while True:
        # 1. Сброс игры и запуск таймера
        supabase.table("game_state").update({"status": "waiting", "time_left": ROUND_TIME}).eq("id", 1).execute()
        
        # Обнуляем ставки предыдущего раунда (удаляем всё из таблицы ставок)
        supabase.table("jackpot_bets").delete().neq("id", 0).execute() 
        print("\n=== НАЧАЛСЯ НОВЫЙ РАУНД. ЖДЕМ СТАВКИ ===")

        # 2. Обратный отсчет
        for seconds_passed in range(ROUND_TIME, -1, -1):
            time.sleep(1)
            # Обновляем таймер в базе данных, чтобы игроки видели секунды
            supabase.table("game_state").update({"time_left": seconds_passed}).eq("id", 1).execute()
            
            # Проверяем, зашел ли кто-то (для логов)
            if seconds_passed % 5 == 0:
                print(f"Осталось времени: {seconds_passed} сек...")

        # 3. Таймер вышел! Блокируем ставки и считаем победителя
        print("🛑 Время вышло! Считаем победителя...")
        supabase.table("game_state").update({"status": "spinning", "time_left": 0}).eq("id", 1).execute()

        # Берем все ставки, которые успели влететь
        bets_res = supabase.table("jackpot_bets").select("*").execute()
        bets = bets_res.data

        if len(bets) == 0:
            print("📭 Никто не поставил. Перезапуск...")
            continue

        # Считаем общую сумму банка
        total_bank = sum(b['bet_amount'] for b in bets)
        
        # Генерируем случайный победный градус от 0 до 360
        winning_degree = random.randint(0, 360)
        
        # Определяем, на кого выпал этот градус
        actual_degree = (360 - winning_degree) % 360
        current_angle = 0
        winner = bets[0] # По умолчанию первый, если что-то пойдет не так

        for b in bets:
            chance = (b['bet_amount'] / total_bank) * 100
            player_angle = (chance / 100) * 360
            next_angle = current_angle + player_angle
            
            if current_angle <= actual_degree <= next_angle:
                winner = b
                break
            current_angle = next_angle

        print(f"🎉 Выпал градус {winning_degree}. ПОБЕДИТЕЛЬ: {winner['user_name']}!")

        # 4. Отправляем по WebSocket (через Realtime Broadcast) команду ВСЕМ вебкам КРУТИТЬ!
        # В Supabase realtime broadcast можно делать через отправку события в специальную служебную таблицу 
        # или напрямую. Для простоты обновим победителя прямо в jackpot_bets или отправим сигнал.
        # Чтобы не усложнять код, мы просто запишем результат в таблицу game_state
        supabase.table("game_state").update({
            "status": "result",
            "time_left": winning_degree, # передаем градус через это поле для хитрости
            "winner": winner['user_name']
        }).eq("id", 1).execute()

        # Даем колесу 7 секунд покрутиться на экранах у игроков перед следующим раундом
        time.sleep(7)

if __name__ == "__main__":
    run_game_loop()
