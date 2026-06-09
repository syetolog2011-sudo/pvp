// Инициализируем Telegram Web App, чтобы кнопка закрытия и цвета подстраивались под ТГ
window.Telegram.WebApp.ready();

// Тестовые ставки (потом они будут прилетать из Supabase)
const bet1 = 500;
const bet2 = 250;

const totalBet = bet1 + bet2;
// Считаем шансы в процентах
const chance1 = (bet1 / totalBet) * 100;
const chance2 = (bet2 / totalBet) * 100;

// Выводим шансы на экран
document.getElementById('p1-chance').innerText = chance1.toFixed(1);
document.getElementById('p2-chance').innerText = chance2.toFixed(1);

// Считаем угол в градусах для первого игрока (макс 360°)
const player1Degrees = (chance1 / 100) * 360;

// Красим колесо: сектор Игрока 1 — желтый (пчелиный), Игрока 2 — фиолетовый
const wheel = document.getElementById('wheel');
wheel.style.background = `conic-gradient(
    #f1c40f 0deg ${player1Degrees}deg, 
    #8e44ad ${player1Degrees}deg 360deg
)`;

// Клик по кнопке "Тест"
document.getElementById('spin-btn').addEventListener('click', () => {
    // Представим, что сервер выбрал случайный победный градус
    // Например, от 0 до 360
    const winningDegree = Math.floor(Math.random() * 360);
    
    // Делаем 5 полных оборотов (1800 градусов) для красоты + добавляем победный градус
    const finalSpin = 1800 + winningDegree;
    
    // Запускаем вращение!
    wheel.style.transform = `rotate(${finalSpin}deg)`;
    
    // Кнопку отключаем на время анимации
    document.getElementById('spin-btn').disabled = true;

    // Определяем, кто выиграл (стрелка сверху смотрит на 0 градусов относительно колеса после остановки)
    // Так как колесо крутится по часовой стрелке, нам нужно учесть это при расчете
    setTimeout(() => {
        const actualDegree = (360 - (winningDegree % 360)) % 360;
        let winner = "";
        
        if (actualDegree <= player1Degrees) {
            winner = "Игрок 1 (Желтый)";
        } else {
            winner = "Игрок 2 (Фиолетовый)";
        }
        
        alert(`Колесо остановилось! Победитель: ${winner}`);
        document.getElementById('spin-btn').disabled = false;
    }, 5000); // 5000 миллисекунд = 5 секунд (время анимации)
});
