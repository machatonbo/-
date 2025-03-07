document.addEventListener('DOMContentLoaded', function() {
    // DOM要素の取得
    const dateFilter = document.getElementById('date-filter');
    const statusFilter = document.getElementById('status-filter');
    const applyFilterBtn = document.getElementById('apply-filter');
    const clearFilterBtn = document.getElementById('clear-filter');
    const reservationsTableBody = document.getElementById('reservations-tbody');
    const noReservations = document.getElementById('no-reservations');
    
    // 編集モーダル要素
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeEditModalBtn = document.getElementById('close-edit-modal');
    
    // 成功メッセージモーダル
    const adminSuccessModal = document.getElementById('admin-success-modal');
    const successTitle = document.getElementById('success-title');
    const successMessage = document.getElementById('success-message');
    const closeSuccessModalBtn = document.getElementById('close-success-modal');
    
    // 編集フォームフィールド
    const editId = document.getElementById('edit-id');
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const editPeople = document.getElementById('edit-people');
    const editDate = document.getElementById('edit-date');
    const editTime = document.getElementById('edit-time');
    const editNotes = document.getElementById('edit-notes');
    const editStatus = document.getElementById('edit-status');
    
    // 現在の日付をデフォルトとして設定
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateFilter.value = formattedDate;
    
    // 初期読み込み
    loadReservations();
    
    // フィルター適用
    applyFilterBtn.addEventListener('click', loadReservations);
    
    // フィルタークリア
    clearFilterBtn.addEventListener('click', function() {
        dateFilter.value = '';
        statusFilter.value = '';
        loadReservations();
    });
    
    // 編集モーダルを閉じる
    closeEditModalBtn.addEventListener('click', function() {
        editModal.classList.add('hidden');
    });
    
    // 成功メッセージモーダルを閉じる
    closeSuccessModalBtn.addEventListener('click', function() {
        adminSuccessModal.classList.add('hidden');
    });
    
    // 予約編集フォーム送信
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        updateReservation();
    });
    
    // 予約データを読み込む関数
    function loadReservations() {
        const date = dateFilter.value;
        const status = statusFilter.value;
        
        let url = '/api/reservations';
        const params = [];
        
        if (date) {
            params.push(`date=${date}`);
        }
        
        if (status) {
            params.push(`status=${status}`);
        }
        
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                displayReservations(data.reservations);
            })
            .catch(error => {
                console.error('予約データの取得に失敗しました:', error);
            });
    }
    
    // 予約データを表示する関数
    function displayReservations(reservations) {
        reservationsTableBody.innerHTML = '';
        
        if (!reservations || reservations.length === 0) {
            reservationsTableBody.innerHTML = '';
            noReservations.classList.remove('hidden');
            return;
        }
        
        noReservations.classList.add('hidden');
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.classList.add(reservation.status === 'cancelled' ? 'cancelled' : '');
            
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${formatDate(reservation.date)}</td>
                <td>${reservation.time}</td>
                <td>${reservation.name}</td>
                <td>${reservation.people}</td>
                <td>${getStatusLabel(reservation.status)}</td>
                <td class="actions">
                    <button class="button small primary edit-btn" data-id="${reservation.id}">編集</button>
                    ${reservation.status !== 'cancelled' ? 
                        `<button class="button small danger cancel-btn" data-id="${reservation.id}">キャンセル</button>` : ''}
                </td>
            `;
            
            reservationsTableBody.appendChild(row);
        });
        
        // 編集ボタンにイベントリスナーを追加
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                loadReservationDetails(id);
            });
        });
        
        // キャンセルボタンにイベントリスナーを追加
        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('この予約をキャンセルしてもよろしいですか？')) {
                    cancelReservation(id);
                }
            });
        });
    }
    
    // 日付をフォーマットする関数
    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    }
    
    // ステータスラベルを取得する関数
    function getStatusLabel(status) {
        switch (status) {
            case 'confirmed':
                return '<span class="status confirmed">確認済み</span>';
            case 'cancelled':
                return '<span class="status cancelled">キャンセル済み</span>';
            default:
                return status;
        }
    }
    
    // 予約詳細を読み込む関数
    function loadReservationDetails(id) {
        fetch(`/api/reservations/${id}`)
            .then(response => response.json())
            .then(data => {
                const reservation = data.reservation;
                
                // 編集フォームに値を設定
                editId.value = reservation.id;
                editName.value = reservation.name;
                editEmail.value = reservation.email;
                editPhone.value = reservation.phone;
                editPeople.value = reservation.people;
                editDate.value = reservation.date;
                editNotes.value = reservation.notes || '';
                editStatus.value = reservation.status;
                
                // 利用可能な時間スロットを読み込み
                loadAvailableTimeSlots(reservation.date, reservation.time);
                
                // モーダルを表示
                editModal.classList.remove('hidden');
            })
            .catch(error => {
                console.error('予約詳細の取得に失敗しました:', error);
            });
    }
    
    // 利用可能な時間スロットを読み込む関数
    function loadAvailableTimeSlots(date, currentTime) {
        fetch(`/api/available-slots?date=${date}`)
            .then(response => response.json())
            .then(data => {
                const timeSelect = document.getElementById('edit-time');
                timeSelect.innerHTML = '';
                
                // 現在の時間スロットを常に追加（他の予約と重複していても）
                const currentOption = document.createElement('option');
                currentOption.value = currentTime;
                currentOption.textContent = formatTimeSlot(currentTime);
                currentOption.selected = true;
                timeSelect.appendChild(currentOption);
                
                // 利用可能な時間スロットを追加
                data.availableSlots.forEach(slot => {
                    if (slot !== currentTime) {
                        const option = document.createElement('option');
                        option.value = slot;
                        option.textContent = formatTimeSlot(slot);
                        timeSelect.appendChild(option);
                    }
                });
            })
            .catch(error => {
                console.error('利用可能な時間スロットの取得に失敗しました:', error);
            });
    }
    
    // 時間スロットをフォーマットする関数
    function formatTimeSlot(timeSlot) {
        const [hour, minute] = timeSlot.split(':');
        return `${hour}:${minute}`;
    }
    
    // 予約を更新する関数
    function updateReservation() {
        const id = editId.value;
        
        const updatedReservation = {
            name: editName.value,
            email: editEmail.value,
            phone: editPhone.value,
            people: parseInt(editPeople.value),
            date: editDate.value,
            time: editTime.value,
            notes: editNotes.value,
            status: editStatus.value
        };
        
        fetch(`/api/reservations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedReservation)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                // 編集モーダルを閉じる
                editModal.classList.add('hidden');
                
                // 成功メッセージを表示
                successTitle.textContent = '更新が完了しました';
                successMessage.textContent = '予約情報が更新されました。';
                adminSuccessModal.classList.remove('hidden');
                
                // 予約一覧を再読み込み
                loadReservations();
            })
            .catch(error => {
                alert(`更新に失敗しました: ${error.error || '不明なエラー'}`);
                console.error('予約の更新に失敗しました:', error);
            });
    }
    
    // 予約をキャンセルする関数
    function cancelReservation(id) {
        fetch(`/api/reservations/${id}/cancel`, {
            method: 'PATCH'
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                // 成功メッセージを表示
                successTitle.textContent = 'キャンセルが完了しました';
                successMessage.textContent = '予約がキャンセルされました。';
                adminSuccessModal.classList.remove('hidden');
                
                // 予約一覧を再読み込み
                loadReservations();
            })
            .catch(error => {
                alert(`キャンセルに失敗しました: ${error.error || '不明なエラー'}`);
                console.error('予約のキャンセルに失敗しました:', error);
            });
    }
    
    // 日付変更イベント
    editDate.addEventListener('change', function() {
        const selectedDate = this.value;
        const currentTime = editTime.value;
        
        loadAvailableTimeSlots(selectedDate, currentTime);
    });
});