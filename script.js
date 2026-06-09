import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://otibfsqphueechyhrfef.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'sb_publishable_rjhxwSlY6YUh5QZ5VvKNzA_jPRMruCp'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tg = window.Telegram.WebApp;
tg.ready();
const myUserId = tg.initDataUnsafe?.user?.id?.toString() || "123456789"; 
const myName = tg.initDataUnsafe?.user?.first_name || "Игрок";

const playerColors = ['#f1c40f', '#8e44ad', '#e74c3c', '#2ecc71', '#3498db', '#e67e22', '#1abc9c', '#fd79a8'];
const myColor = playerColors[Math.floor(Math.random() * playerColors.length)];

const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spin-btn');
const timerText = document.getElementById('timer-text');
const balanceText = document.getElementById('user-balance');
const betInput = document.getElementById('bet-amount-input');

let currentBalance = 0; 
wheel.style.background = '#333333';

// Загрузка баланса мёда из таблицы пользователей бота (users)
async function loadUserBalance() {
    const { data, error } = await supabase
        .from('users') 
        .select('honey') 
        .eq('telegram_id', myUserId)
        .single();

    if (data) {
        currentBalance = data.honey;
        balanceText.innerText = currentBalance;
    } else {
        currentBalance = 5000; 
        balanceText.innerText = currentBalance + " (Тест)";
    }
}

// Отрисовка секторов круга
function redrawWheel(bets) {
    if (!bets || bets.length === 0) {
        wheel.style.background = '#333333';
        return;
    }
    const totalBank = bets.reduce((sum, b) => sum + b.bet_amount, 0);
    let currentAngle = 0;
    let gradientString = "";

    bets.forEach((bet, index) => {
        const chance = (bet.bet_amount / totalBank) * 100;
        const playerAngle = (chance / 100) * 360;
        const nextAngle = currentAngle + playerAngle;
        gradientString += `${bet.color} ${currentAngle}deg ${nextAngle}deg`;
        if (index < bets.length - 1) gradientString += ", ";
        currentAngle = nextAngle;
    });
    wheel.style.background = `conic-gradient(${gradientString})`;
}

// Отправка кастомной ставки
spinBtn.addEventListener('click', async () => {
    const betAmount = parseInt(betInput.value);

    if (isNaN(betAmount) || betAmount <= 0) {
        alert("Введите правильную сумму ставки!");
        return;
    }
    if (betAmount > currentBalance) {
        alert("Недостаточно меда на балансе!");
        return;
    }

    spinBtn.disabled = true;
    currentBalance -= betAmount;
    balanceText.innerText = currentBalance;

    // Списываем мёд в таблице бота
    await supabase
        .from('users')
        .update({ honey: currentBalance })
        .eq('telegram_id', myUserId);

    // Добавляем ставку в рулетку
    await supabase
        .from('jackpot_bets')
        .insert([{ 
            user_id: myUserId, 
            user_name: myName, 
            bet_amount: betAmount, 
            color: myColor 
        }]);
        
    spinBtn.innerText = "Ставка принята!";
});

// Слушаем ставки игроков
supabase
    .channel('jackpot_bets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jackpot_bets' }, async () => {
        const { data: allBets } = await supabase.from('jackpot_bets').select('*');
        redrawWheel(allBets);
    })
    .subscribe();

// Слушаем сервер и таймер
supabase
    .channel('game_state_changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' }, (payload) => {
        const data = payload.new;

        if (data.status === 'waiting') {
            timerText.style.color = '#f1c40f';
            timerText.innerText = `До прокрутки: ${data.time_left} сек`;
            spinBtn.disabled = false;
            spinBtn.innerText = "Поставить 🪙";
        } 
        
        if (data.status === 'spinning') {
            timerText.style.color = '#e74c3c';
            timerText.innerText = `Ставки закрыты!`;
            spinBtn.disabled = true;
        }

        if (data.status === 'result') {
            timerText.style.color = '#2ecc71';
            timerText.innerText = `🎉 Победил: ${data.winner}!`;
            spinBtn.disabled = true;
            
            const finalSpin = 1800 + data.time_left;
            wheel.style.transform = `rotate(${finalSpin}deg)`;
            
            setTimeout(() => {
                loadUserBalance();
            }, 6000);
        }
    })
    .subscribe();

async function initGame() {
    await loadUserBalance();
    const { data: currentBets } = await supabase.from('jackpot_bets').select('*');
    if (currentBets) redrawWheel(currentBets);
}
initGame();
