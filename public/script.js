document.addEventListener('DOMContentLoaded', () => {
    // グローバル変数
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTimeSlot = null;
    
    // Make sure the success modal is hidden on page load
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('reservation-form-container').classList.add('hidden');
    
    // カレンダーを生成する関数
    function generateCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // 月と年の表示を更新
        document.getElementById('month-year').textContent = `${year}年${month + 1}月`;
        
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = '';
        
        // 前月の日を追加
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day', 'other-month');
            dayEl.textContent = prevMonthLastDay - i;
            calendarEl.appendChild(dayEl);
        }
        
        // 当月の日を追加
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');
            dayEl.textContent = i;
            
            // 今日の日付をハイライト
            if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
                dayEl.classList.add('today');
            }
            
            // 過去の日付は選択不可に
            const currentDateObj = new Date();
            const dateToCheck = new Date(year, month, i);
            if (dateToCheck < currentDateObj && !(year === currentDateObj.getFullYear() && 
                month === currentDateObj.getMonth() && i === currentDateObj.getDate())) {
                dayEl.classList.add('unavailable');
            }
            // 水曜日から日曜日のみ選択可能に（曜日: 0=日曜, 1=月曜, ..., 6=土曜）
            else {
                const dayOfWeek = new Date(year, month, i).getDay();
                if (dayOfWeek >= 3 || dayOfWeek === 0) { // 水(3)木(4)金(5)土(6)日(0)
                    dayEl.classList.add('available');
                    dayEl.addEventListener('click', () => {
                        // 選択状態の更新
                        document.querySelectorAll('.day.selected').forEach(el => {
                            el.classList.remove('selected');
                        });
                        dayEl.classList.add('selected');
                        
                        selectedDate = new Date(year, month, i);
                        updateTimeSlots(selectedDate);
                    });
                } else {
                    dayEl.classList.add('unavailable');
                }
            }
            
            calendarEl.appendChild(dayEl);
        }
        
        // 次月の日を追加して7×6のグリッドにする
        const totalCells = 42;
        const cellsToAdd = totalCells - (startingDay + daysInMonth);
        for (let i = 1; i <= cellsToAdd; i++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day', 'other-month');
            dayEl.textContent = i;
            calendarEl.appendChild(dayEl);
        }
    }
    
    // 時間枠を更新する関数
    function updateTimeSlots(date) {
        const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${getJapaneseDayOfWeek(date.getDay())}）`;
        document.getElementById('selected-date').textContent = formattedDate;
        
        const timeSlotsEl = document.getElementById('time-slots');
        timeSlotsEl.innerHTML = '';
        
        // 予約可能時間帯: 17:00-21:00、30分ごと
        for (let hour = 17; hour < 21; hour++) {
            for (let minute of [0, 30]) {
                const timeString = `${hour}:${minute === 0 ? '00' : minute}`;
                
                const timeSlotEl = document.createElement('div');
                timeSlotEl.classList.add('time-slot');
                timeSlotEl.textContent = timeString;
                
                // 現在の日付で、すでに過ぎた時間は予約不可
                const now = new Date();
                const selectedDateTime = new Date(date);
                selectedDateTime.setHours(hour, minute, 0, 0);
                
                if (selectedDateTime <= now) {
                    timeSlotEl.classList.add('unavailable');
                } else {
                    // TODO: 実際には、DBから予約済みの時間枠を取得して、利用不可にする処理を入れる
                    // ここではデモのため、ランダムに一部の時間枠を予約済みとする
                    const isUnavailable = Math.random() < 0.3;
                    if (isUnavailable) {
                        timeSlotEl.classList.add('unavailable');
                    } else {
                        timeSlotEl.classList.add('available');
                        timeSlotEl.addEventListener('click', () => {
                            // 選択状態の更新
                            document.querySelectorAll('.time-slot.selected').forEach(el => {
                                el.classList.remove('selected');
                            });
                            timeSlotEl.classList.add('selected');
                            
                            selectedTimeSlot = timeString;
                            showReservationForm();
                        });
                    }
                }
                
                timeSlotsEl.appendChild(timeSlotEl);
            }
        }
    }
    
    // 曜日を日本語で取得する関数
    function getJapaneseDayOfWeek(dayIndex) {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return days[dayIndex];
    }
    
    // 予約フォームを表示する関数
    function showReservationForm() {
        const formattedDate = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${selectedTimeSlot}`;
        document.getElementById('reservation-datetime').textContent = formattedDate;
        document.getElementById('reservation-form-container').classList.remove('hidden');
    }
    
    // 次の月へ
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    // 前の月へ
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    // キャンセルボタン
    document.getElementById('cancel-reservation').addEventListener('click', () => {
        document.getElementById('reservation-form-container').classList.add('hidden');
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
        selectedTimeSlot = null;
    });
    
    // 予約フォームの送信
    document.getElementById('reservation-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // フォームデータの取得
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            numPeople: document.getElementById('num-people').value,
            notes: document.getElementById('notes').value,
            date: `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`,
            time: selectedTimeSlot
        };
        
        // TODO: サーバーにデータを送信する処理
        console.log('予約データ:', formData);
        
        // 成功モーダルを表示
        document.getElementById('success-modal').classList.remove('hidden');
        
        // フォームをリセット
        document.getElementById('reservation-form').reset();
        document.getElementById('reservation-form-container').classList.add('hidden');
    });
    
    // モーダルを閉じる
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('success-modal').classList.add('hidden');
        
        // 選択状態をリセット
        document.querySelectorAll('.day.selected').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        selectedDate = null;
        selectedTimeSlot = null;
        document.getElementById('selected-date').textContent = '日付を選択してください';
        document.getElementById('time-slots').innerHTML = '';
    });
    
    // 初期カレンダーの生成
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
});