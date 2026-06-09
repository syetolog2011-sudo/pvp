import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'ТВОЙ_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'ТВОЙ_SUPABASE_ANON_KEY'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Данные Телеграма
const tg = window.Telegram.WebApp;
tg.ready();
const myUserId = tg.initDataUnsafe?.user?.id || "user_" + Math.floor(Math.random() * 1000);
const myName = tg.initDataUnsafe?.user?.first_name || "Игрок_" + Math.floor(Math.random() * 100);

// Массив со случайными сочными цветами для игроков
const playerColors = ['#f1c40f', '#8e44ad', '#e74c3c', '#2ecc71', '#3498db', '#e67e22', '#1abc9c'];
// Назначаем текущему игроку случайный цвет из списка
const myColor = playerColors[Math.floor(Math.random() * playerColors.length)];

const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spin-btn');
spinBtn.innerText = "Сделать ставку 500";

// Изначально круг серый (пока нет игроков)
wheel.style.background = '#333333';

// 1. ФУНКЦИЯ ОТРИСОВКИ КРУГА НА ОСНОВЕ СТАВОК БАЗЫ ДАННЫХ
function redrawWheel(bets) {
    if (bets.length === 0) {
        wheel.style.background = '#333333';
        return;
    }

    // Считаем общий банк раунда
    const totalBank = bets.reduce((sum, b) => sum + b.bet_amount, 0);
    
    let currentAngle = 0;
    let gradientString = "";

    bets.forEach((bet, index) => {
        const chance = (bet.bet_amount / totalBank) * 100;
        const playerAngle = (chance / 100) * 360;
        const nextAngle = currentAngle + playerAngle;

        // Строим сектор для каждого игрока
        gradientString += `${bet.color} ${currentAngle}deg ${nextAngle}deg`;
        if (index < bets.length - 1) gradientString += ", ";

        currentAngle = nextAngle;
    });

    // Применяем цвета к колесу
    wheel.style.background = `conic-gradient(${gradientString})`;
}

// 2. ОТПРАВКА СТАВКИ В БАЗУ ПРИ НАЖАТИИ
spinBtn.addEventListener('click', async () => {
    spinBtn.disabled = true;
    
    // Кидаем нашу ставку в общую таблицу
    await supabase
        .from('jackpot_bets')
        .insert([{ 
            user_id: myUserId, 
            user_name: myName, 
            bet_amount: 500, 
            color: myColor 
        }]);
        
    spinBtn.innerText = "Ставка принята!";
});

// 3. ПОДКЛЮЧЕНИЕ К WEBSOCKET (СЛУШАЕМ СТАВКИ ВСЕХ ИГРОКОВ В РЕАЛЬНОМ ВРЕМЕНИ)
const channel = supabase
    .channel('schema-db-changes')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jackpot_bets' },
        async (payload) => {
            // Как только кто-то (ты или другой случайный челик) сделал ставку,
            // запрашиваем свежий список всех ставок раунда
            const { data: allBets } = await supabase
                .from('jackpot_bets')
                .select('*');
            
            // И мгновенно перерисовываем круг у ВСЕХ игроков на экранах!
            redrawWheel(allBets);
        }
    )
    .subscribe();

// Загружаем ставки при первом открытии игры (если кто-то уже зашел до нас)
async function initGame() {
    const { data: currentBets } = await supabase.from('jackpot_bets').select('*');
    if (currentBets) redrawWheel(currentBets);
}
initGame();
