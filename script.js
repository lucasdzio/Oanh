/* ==========================================================================
   STATE VARIABLES
   ========================================================================== */
let noCount = 0;
let baseYesScale = 1.0;
let easterEggScale = 0.0;
let isChasing = false;
let chaseStartTime = 0;
let lastJumpTime = 0;
let lastEscapeTime = 0; // Cooldown giữa các lần nhảy để người dùng kịp click
let easterEggTriggered = false;
let heartFireworksInterval = null;
let musicStarted = false;

// SVG path for beautiful hearts
const heartSvgPath = `M16,28.261c0,0-14-7.904-14-17.15c0-5.109,4.141-9.25,9.25-9.25c3.084,0,5.811,1.508,7.5,3.834c1.689-2.326,4.416-3.834,7.5-3.834c5.109,0,9.25,4.141,9.25,9.25C30,20.357,16,28.261,16,28.261z`;

const pleaMessages = [
    "Anh biết lỗi rồi 😭",
    "Bé đừng giận nữa mà 🥺",
    "Anh hứa sẽ bù cho em ❤️",
    "Cho anh một cơ hội nha 😭",
    "Thôi màaaaa 😭💖",
    "Anh mua trà sữa cho em 🧋",
    "Anh yêu em nhiều lắm ❤️",
    "Đừng bấm NO nữa mà 😭"
];

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const screen1 = document.getElementById("screen-1");
const screen2 = document.getElementById("screen-2");
const btnYes = document.getElementById("btn-yes");
const btnNo = document.getElementById("btn-no");
const btnRestart = document.getElementById("btn-restart");
const speechBubble = document.getElementById("speech-bubble");
const pleaText = document.getElementById("plea-text");
const heartsBg = document.getElementById("hearts-bg");
const heartBurstContainer = document.getElementById("heart-burst-container");
const modal = document.getElementById("easter-egg-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const musicController = document.getElementById("music-controller");
const bgMusic = document.getElementById("bg-music");

/* ==========================================================================
   BACKGROUND FLOATING HEARTS (VECTOR SVG)
   ========================================================================== */
function spawnFloatingHeart(initial = false) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("class", "floating-heart-svg");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", heartSvgPath);

    const colors = ["#ff758f", "#ff85a2", "#ffb7b2", "#ffd1dc", "#c77dff", "#f72585", "#ffc2d1"];
    path.setAttribute("fill", colors[Math.floor(Math.random() * colors.length)]);
    svg.appendChild(path);

    svg.style.left = `${Math.random() * 100}vw`;

    const size = 14 + Math.random() * 18;
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;

    const duration = 5 + Math.random() * 5;
    svg.style.animationDuration = `${duration}s`;

    if (initial) {
        const randomY = Math.random() * 100;
        svg.style.bottom = `${randomY}vh`;
        svg.style.animationDuration = `${duration * (1 - randomY / 100)}s`;
    }

    heartsBg.appendChild(svg);

    setTimeout(() => {
        svg.remove();
    }, duration * 1000);
}

function initBackgroundHearts() {
    for (let i = 0; i < 15; i++) {
        spawnFloatingHeart(true);
    }
    setInterval(() => spawnFloatingHeart(false), 400);
}

/* ==========================================================================
   ROMANTIC MUSIC PLAYBACK LOGIC
   ========================================================================== */
function startMusic() {
    if (musicStarted) return;
    bgMusic.play().then(() => {
        musicStarted = true;
        musicController.classList.add("playing");
        window.removeEventListener("pointerdown", startMusic);
        window.removeEventListener("click", startMusic);
    }).catch(err => {
        console.log("Music play pending user interaction: ", err);
    });
}

function toggleMusic() {
    if (bgMusic.paused) {
        bgMusic.play().then(() => {
            musicStarted = true;
            musicController.classList.add("playing");
        });
    } else {
        bgMusic.pause();
        musicController.classList.remove("playing");
    }
}

/* ==========================================================================
   HEART BURST EXPLOSION (VECTOR SVG)
   ========================================================================== */
function createHeartBurst(x, y, count = 40) {
    const colors = ["#ff758f", "#ff85a2", "#ff4d6d", "#c77dff", "#ff0a54", "#ff5c8a"];

    for (let i = 0; i < count; i++) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 32 32");
        svg.setAttribute("class", "burst-particle-svg");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", heartSvgPath);
        path.setAttribute("fill", colors[Math.floor(Math.random() * colors.length)]);
        svg.appendChild(path);

        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 240;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        const duration = 0.8 + Math.random() * 0.8;
        const scale = 0.6 + Math.random() * 1.2;
        const rot = Math.random() * 720 - 360;

        svg.style.setProperty("--dx", `${dx}px`);
        svg.style.setProperty("--dy", `${dy}px`);
        svg.style.setProperty("--scale", scale);
        svg.style.setProperty("--rot", `${rot}deg`);
        svg.style.setProperty("--duration", `${duration}s`);

        svg.style.left = `${x}px`;
        svg.style.top = `${y}px`;

        heartBurstContainer.appendChild(svg);

        setTimeout(() => {
            svg.remove();
        }, duration * 1000);
    }
}

function triggerHeartFireworks() {
    heartFireworksInterval = setInterval(() => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        createHeartBurst(x, y, 15);
    }, 350);
}

/* ==========================================================================
   NO BUTTON ESCAPE LOGIC
   - CHỈ di chuyển nút + hiện câu xin lỗi
   - KHÔNG tăng noCount (phải click mới tăng)
   - Chỉ chạy trốn khi noCount >= 1 (đã click ít nhất 1 lần)
   ========================================================================== */
function escapeNoButton(clientX, clientY) {
    // Chỉ chạy trốn sau khi đã click NO ít nhất 1 lần
    if (noCount === 0 || noCount >= 5) return;

    // Cooldown giảm dần theo stage — càng về sau càng khó bắt
    const now = Date.now();
    let cooldown = 800;
    if (noCount === 2) cooldown = 800;
    else if (noCount === 3) cooldown = 800;
    else if (noCount >= 4) cooldown = 750;
    if (now - lastEscapeTime < cooldown) return;
    lastEscapeTime = now;

    // Chuyển sang fixed positioning VÀ đưa ra body
    // (card cha có transform animation nên position:fixed bị lệch)
    if (!btnNo.classList.contains("running")) {
        const rect = btnNo.getBoundingClientRect();
        btnNo.classList.add("running");
        document.body.appendChild(btnNo); // Thoát khỏi card transform context
        btnNo.style.left = `${rect.left}px`;
        btnNo.style.top = `${rect.top}px`;
        btnNo.offsetHeight;
    }

    const rect = btnNo.getBoundingClientRect();
    const margin = 50;
    const minX = margin;
    const maxX = window.innerWidth - rect.width - margin;
    const minY = margin;
    const maxY = window.innerHeight - rect.height - margin;

    let newX = 0;
    let newY = 0;
    let attempts = 0;

    do {
        newX = Math.random() * (maxX - minX) + minX;
        newY = Math.random() * (maxY - minY) + minY;
        attempts++;
    } while (Math.hypot(clientX - (newX + rect.width / 2), clientY - (newY + rect.height / 2)) < 150 && attempts < 100);

    btnNo.style.left = `${newX}px`;
    btnNo.style.top = `${newY}px`;

    // Thay đổi tốc độ và xoay theo stage
    if (noCount === 2) {
        btnNo.style.transition = "left 0.12s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.12s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.15s ease";
    } else if (noCount >= 3) {
        const randomRot = Math.random() * 50 - 25;
        document.documentElement.style.setProperty("--rot-no", `${randomRot}deg`);
        btnNo.style.transition = "left 0.1s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.1s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.1s ease";
    }

    // Hiện câu xin lỗi ngẫu nhiên khi chạy trốn (nhưng KHÔNG tăng noCount)
    updateSpeechBubble();

    // Theo dõi Easter Egg
    trackEasterEggChase();
}

/* ==========================================================================
   UPDATE SPEECH BUBBLE WITH RANDOM PLEA
   ========================================================================== */
function updateSpeechBubble() {
    const randomMsg = pleaMessages[Math.floor(Math.random() * pleaMessages.length)];
    pleaText.textContent = randomMsg;

    speechBubble.classList.remove("show");
    speechBubble.offsetHeight;
    speechBubble.classList.add("show");
}

/* ==========================================================================
   EASTER EGG CHASE TRACKING
   ========================================================================== */
function trackEasterEggChase() {
    if (easterEggTriggered) return;

    const now = Date.now();
    if (!isChasing) {
        isChasing = true;
        chaseStartTime = now;
    } else {
        if (now - lastJumpTime > 2000) {
            chaseStartTime = now;
        }
    }
    lastJumpTime = now;

    if (now - chaseStartTime >= 10000) {
        triggerEasterEgg();
    }
}

function triggerEasterEgg() {
    easterEggTriggered = true;
    isChasing = false;

    modal.classList.add("open");

    easterEggScale += 0.5;
    updateButtonSizes();
}

/* ==========================================================================
   UPDATE BUTTON SIZES
   ========================================================================== */
function updateButtonSizes() {
    const finalYesScale = baseYesScale + easterEggScale;
    document.documentElement.style.setProperty("--scale-yes", finalYesScale);

    let noScale = 1.0;
    if (noCount === 1) noScale = 0.8;
    else if (noCount === 2) noScale = 0.6;
    else if (noCount === 3) noScale = 0.45;
    else if (noCount === 4) noScale = 0.3;
    else if (noCount >= 5) noScale = 0.0;

    document.documentElement.style.setProperty("--scale-no", noScale);
}

/* ==========================================================================
   INTERACTION LOGIC: NO CLICKED
   - CHỈ gọi khi người dùng THỰC SỰ click vào nút NO
   ========================================================================== */
function handleNoClick() {
    noCount++;

    // Hiện câu xin lỗi
    updateSpeechBubble();

    // Thay đổi kích thước theo stage (Mỗi lần click YES sẽ to hẳn ra)
    if (noCount === 1) {
        baseYesScale = 2.0;
    } else if (noCount === 2) {
        baseYesScale = 3.2;
    } else if (noCount === 3) {
        baseYesScale = 4.8;
    } else if (noCount === 4) {
        baseYesScale = 7.0;
    } else if (noCount >= 5) {
        // Bước 5: NO biến mất, YES phủ toàn bộ màn hình
        btnNo.style.display = "none";

        // Tạo overlay fullscreen gắn trực tiếp vào body (không bị kẹt trong container)
        const fullscreenOverlay = document.createElement("div");
        fullscreenOverlay.id = "fullscreen-yes-overlay";
        fullscreenOverlay.innerHTML = `
            <div class="fullscreen-yes-content">
                <span class="fullscreen-title">YES 💖</span>
                <span class="fullscreen-sub1">🥺 Em không thể từ chối anh nữa đâu 💖</span>
                <span class="fullscreen-sub2">Anh biết anh sai rồi 😭</span>
            </div>
        `;
        fullscreenOverlay.addEventListener("click", (e) => {
            handleYesClick(e);
            fullscreenOverlay.remove();
        });
        document.body.appendChild(fullscreenOverlay);

        // Ẩn speech bubble
        speechBubble.style.display = "none";
    }

    updateButtonSizes();

    // Sau click đầu tiên, lập tức đưa NO ra body và nhảy đi
    // để không bị YES (z-index cao hơn trong card) che mất
    if (noCount >= 1 && noCount < 5 && !btnNo.classList.contains("running")) {
        const rect = btnNo.getBoundingClientRect();
        btnNo.classList.add("running");
        document.body.appendChild(btnNo);
        const margin = 50;
        const newX = Math.random() * (window.innerWidth - rect.width - margin * 2) + margin;
        const newY = Math.random() * (window.innerHeight - rect.height - margin * 2) + margin;
        btnNo.style.left = `${newX}px`;
        btnNo.style.top = `${newY}px`;
        lastEscapeTime = Date.now();
    }
}

/* ==========================================================================
   INTERACTION LOGIC: YES CLICKED
   ========================================================================== */
function handleYesClick(e) {
    let clickX = window.innerWidth / 2;
    let clickY = window.innerHeight / 2;

    if (e && e.clientX && e.clientY) {
        clickX = e.clientX;
        clickY = e.clientY;
    }

    createHeartBurst(clickX, clickY, 60);
    triggerHeartFireworks();

    // Ẩn nút NO (có thể đang nằm trong body ở chế độ running)
    btnNo.style.display = "none";

    setTimeout(() => {
        clearInterval(heartFireworksInterval);
        screen1.classList.add("fade-out");

        setTimeout(() => {
            screen1.classList.remove("active", "fade-out");
            screen2.classList.add("active");
        }, 600);

    }, 2500);
}

/* ==========================================================================
   INTERACTION LOGIC: RESTART
   ========================================================================== */
function resetApplication() {
    screen2.classList.add("fade-out");

    setTimeout(() => {
        screen2.classList.remove("active", "fade-out");

        // Reset states
        noCount = 0;
        baseYesScale = 1.0;
        easterEggScale = 0.0;
        isChasing = false;
        chaseStartTime = 0;
        lastJumpTime = 0;
        easterEggTriggered = false;

        // Xoá overlay fullscreen nếu còn
        const overlay = document.getElementById("fullscreen-yes-overlay");
        if (overlay) overlay.remove();

        // Khôi phục nút NO — đưa lại vào buttons-wrapper
        const buttonsWrapper = document.querySelector('.buttons-wrapper');
        if (buttonsWrapper && !buttonsWrapper.contains(btnNo)) {
            buttonsWrapper.appendChild(btnNo);
        }
        btnNo.classList.remove("running");
        btnNo.style.cssText = "";
        btnNo.style.display = "";
        document.documentElement.style.setProperty("--scale-no", "1");
        document.documentElement.style.setProperty("--rot-no", "0deg");

        // Khôi phục nút YES
        btnYes.classList.remove("fullscreen", "pulse-anim");
        btnYes.innerHTML = "YES 💖";
        document.documentElement.style.setProperty("--scale-yes", "1");

        // Khôi phục speech bubble
        speechBubble.style.display = "";
        pleaText.textContent = "Bé đừng giận anh nữa mà... 🥺";
        speechBubble.classList.remove("show");

        screen1.classList.add("active");
    }, 600);
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
window.addEventListener("DOMContentLoaded", () => {
    initBackgroundHearts();
});

// Music auto-play on first interaction
window.addEventListener("click", startMusic);
window.addEventListener("pointerdown", startMusic);

musicController.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMusic();
});

// ===== HOVER: Chỉ chạy trốn, KHÔNG tăng noCount =====
window.addEventListener("pointermove", (e) => {
    // Chỉ chạy trốn khi đã click NO ít nhất 1 lần (noCount >= 1) và chưa đến 5
    if (noCount === 0 || noCount >= 5) return;

    const rect = btnNo.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;

    const distance = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

    if (distance < 30) {
        escapeNoButton(e.clientX, e.clientY);
    }
});

// ===== TOUCH trên mobile: chạy trốn khi chạm gần nút NO =====
btnNo.addEventListener("pointerdown", (e) => {
    if (noCount >= 1 && noCount < 5) {
        // Đã ở chế độ chạy trốn → chạy trốn thay vì cho click
        e.preventDefault();
        e.stopPropagation();
        escapeNoButton(e.clientX, e.clientY);
    }
});

// ===== CLICK: Tăng noCount - CHỈ hoạt động khi nút chưa ở chế độ chạy trốn =====
btnNo.addEventListener("click", (e) => {
    // Chỉ cho click khi chưa bắt đầu chạy trốn (noCount = 0)
    // hoặc khi người dùng may mắn click được (noCount 1-4)
    if (noCount < 5) {
        handleNoClick();
    }
});

// YES action
btnYes.addEventListener("click", (e) => {
    handleYesClick(e);
});

// Restart action
btnRestart.addEventListener("click", resetApplication);

// Modal handling
btnCloseModal.addEventListener("click", () => {
    modal.classList.remove("open");
});

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.remove("open");
    }
});
