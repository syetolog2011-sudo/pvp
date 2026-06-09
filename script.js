// Массив игроков в текущем раунде (будет прилетать из базы данных Supabase)
const players = [
    { name: "Маэстро", bet: 500, color: "#f1c40f" }, // Желтый
    { name: "Случайный Пчел", bet: 250, color: "#8e44ad" }, // Фиолетовый
    { name: "Иван_99", bet: 100, color: "#e74c3c" }, // Красный
    { name: "Мария_Кот", bet: 150, color: "#2ecc71" }, // Зеленый
];

function updateWheel() {
    // Считаем общий банк
    const totalBet = players.reduce((sum, p) => sum + p.bet, 0);
    
    let currentAngle = 0;
    let gradientString = "";

    // Пересчитываем шансы и строим динамический градиент для круга
    players.forEach((player, index) => {
        const chance = (player.bet / totalBet) * 100;
        const playerAngle = (chance / 100) * 360;
        const nextAngle = currentAngle + playerAngle;

        // Формируем строчку для CSS
        gradientString += `${player.color} ${currentAngle}deg ${nextAngle}deg`;
        if (index < players.length - 1) gradientString += ", ";

        currentAngle = nextAngle;
    });

    // Красим наше колесо!
    const wheel = document.getElementById('wheel');
    wheel.style.background = `conic-gradient(${gradientString})`;
}

// Запускаем обновление круга
updateWheel();
