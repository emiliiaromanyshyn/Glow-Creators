document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reviewForm');
    const container = document.getElementById('reviewsContainer');

    // Функція створення картки (дизайн як у Figma)
    function createCard(name, text) {
        const date = "Сьогодні"; 
        return `
            <div class="review-card">
                <div class="card-user">
                    <img src="https://ui-avatars.com/api/?name=${name}&background=612a26&color=fff" alt="user">
                    <div>
                        <span class="user-name">${name}</span>
                        <span class="user-date">${date}</span>
                    </div>
                </div>
                <div style="color: #612a26; margin-bottom: 10px;">★★★★★</div>
                <p>${text}</p>
            </div>
        `;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault(); // КРИТИЧНО: зупиняє перезавантаження

        const nameValue = document.getElementById('userName').value;
        const textValue = document.getElementById('userText').value;

        if(nameValue && textValue) {
            // Додаємо новий відгук нагору
            container.insertAdjacentHTML('afterbegin', createCard(nameValue, textValue));
            
            // Очищаємо поля
            form.reset();
            
            // Плавний скролл до нового відгуку
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
