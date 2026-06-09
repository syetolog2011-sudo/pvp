const SUPABASE_URL = 'https://otibfsqphueechyhrfef.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rjhxwSlY6YUh5QZ5VvKNzA_jPRMruCp'; 

// Создаем клиент один раз через глобальный объект window (CORS обойден)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Безопасная инициализация Telegram Web App
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
let userId = "12345678"; 
let userName = "Игрок";

if (tg) {
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = String(tg.initDataUnsafe.user.id);
        userName = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Игрок";
    }
}

// Элементы интерфейса
const honeyEl = document.getElementById('user-honey');
const statusEl = document.getElementById('status-text');
const betInput = document.getElementById('bet-amount');
const betBtn = document.getElementById('place-bet-btn');
const wheelEl = document.getElementById('roulette-wheel');

let currentHoney = 0;
let canPlaceBets = false;

// 1. Получаем баланс пользователя из таблицы 'users'
async function loadUserData() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('honey')
            .eq('telegram_id', userId)
            .single();

        if (error) throw error;

        if (data) {
            currentHoney = parseInt(data.honey) || 0;
            honeyEl.innerText = `${currentHoney} 🍯`;
        }
    } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
        honeyEl.innerText = "Ошибка ❌";
    }
}

// 2. Функция отправки ставки в базу
async function placeBet() {
    const amount = parseInt(betInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Введите корректную сумму!");
        return;
    }
    if (amount > currentHoney) {
        alert("Недостаточно мёда!");
        return;
    }

    betBtn.disabled = true;

    try {
        currentHoney -= amount;
        honeyEl.innerText = `${currentHoney} 🍯`;

        const { error } = await supabase.from('jackpot_bets').insert([
            { user_id: userId, user_name: userName, bet_amount: amount }
        ]);

        if (error) throw error;
        alert("Ставка успешно принята!");
    } catch (err) {
        console.error("Ошибка при ставке:", err);
        alert("Сбой при отправке ставки.");
        betBtn.disabled = false;
    }
}

// 3. Обработка изменений состояния игры от Python-сервера
function updateUI(gameState) {
    const { status, time_left, winner } = gameState;

    if (status === 'waiting') {
        statusEl.innerText = `До начала: ${time_left} сек`;
        betBtn.disabled = false;
        canPlaceBets = true;
    } else if (status === 'spinning') {
        statusEl.innerText = `🎰 Ставки закрыты! Крутим...`;
        betBtn.disabled = true;
        canPlaceBets = false;
    } else if (status === 'result') {
        canPlaceBets = false;
        betBtn.disabled = true;
        
        const degree = parseInt(time_left) || 0;
        const totalSpins = 3600; 
        wheelEl.style.transform = `rotate(${totalSpins + degree}deg)`;
        
        statusEl.innerText = `🎉 Победил: ${winner}!`;
        
        setTimeout(() => {
            wheelEl.style.transition = 'none';
            wheelEl.style.transform = 'rotate(0deg)';
            setTimeout(() => { wheelEl.style.transition = 'transform 7s cubic-bezier(0.25, 0.1, 0.1, 1)'; }, 50);
            loadUserData(); 
        }, 6500);
    }
}

// 4. Подписка на Realtime веб-сокеты таблицы game_state
async function initRealtime() {
    const { data } = await supabase.from('game_state').select('*').eq('id', 1).single();
    if (data) updateUI(data);

    supabase.channel('public:game_state')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' }, (payload) => {
            if (payload.new) {
                updateUI(payload.new);
            }
        })
        .subscribe((status) => {
            console.log("Статус подключения к сокетам Supabase:", status);
        });
}

betBtn.addEventListener('click', placeBet);

// Старт
loadUserData();
initRealtime();
