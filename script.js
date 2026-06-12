const API_KEY = "414fa9cd1d5abe3a521d0c8b4d8d9d2a";

const loader = document.getElementById("loader");
const moviesContainer = document.getElementById("moviesContainer");
const sectionLabel = document.getElementById("sectionLabel");

let currentMovies = [];
let currentLang = "te";
let currentYear = "";
let currentType = "movie";
let currentPage = 1;
let totalPages = 1;
let currentMode = "discover";
let currentGenreId = "";
let currentSort = "popularity.desc";
let currentMinRating = "";
let currentCategory = "movie";
let currentGenreOverride = "";

// PWA Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Populate year dropdown
const yearFilter = document.getElementById("yearFilter");
const currentYear_ = new Date().getFullYear();
for (let y = currentYear_; y >= 1990; y--) {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    yearFilter.appendChild(opt);
}

// ===== TOAST =====
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== WATCH HISTORY =====
function addToHistory(movie) {
    let history = JSON.parse(localStorage.getItem("tf_history")) || [];
    history = history.filter(m => m.id !== movie.id);
    history.unshift({ ...movie, _visitedAt: Date.now() });
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem("tf_history", JSON.stringify(history));
}

// ===== PAGINATION =====
function renderPagination() {
    let pg = document.getElementById("paginationBar");
    if (!pg) {
        pg = document.createElement("div");
        pg.id = "paginationBar";
        pg.className = "pagination-bar";
        moviesContainer.after(pg);
    }
    const noPages = ["favorites", "watchlater", "history", "search"].includes(currentMode);
    if (noPages || totalPages <= 1) { pg.innerHTML = ""; return; }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>◀</button>`;
    if (start > 1) html += `<button onclick="changePage(1)">1</button>${start > 2 ? "<span>…</span>" : ""}`;
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === currentPage ? "pg-active" : ""}" onclick="changePage(${i})">${i}</button>`;
    }
    if (end < totalPages) html += `${end < totalPages - 1 ? "<span>…</span>" : ""}<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>▶</button>`;
    html += `<span class="pg-info">Page ${currentPage} of ${totalPages}</span>`;
    pg.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (currentMode === "discover") loadMovies(false);
    else if (currentMode === "trending") loadTrendingMovies(false);
    else if (currentMode === "toprated") loadTopRated(false);
    else if (currentMode === "newreleases") loadNewReleases(false);
    else if (currentMode === "upcoming") loadUpcoming(false);
    else if (currentMode === "genre") fetchMoviesByGenre(currentGenreId, false);
}

// ===== LOAD MOVIES =====
async function loadMovies(reset = true) {
    currentMode = "discover";
    if (reset) currentPage = 1;
    currentSort = document.getElementById("sortFilter")?.value || "popularity.desc";
    currentMinRating = document.getElementById("ratingFilter")?.value || "";
    sectionLabel.textContent = `${currentType === "tv" ? "📺" : "🎬"} ${getLangName(currentLang)} ${currentType === "tv" ? "Web Series" : "Movies"}${currentYear ? " - " + currentYear : ""}`;
    loader.style.display = "block";
    try {
        const yearParam = currentYear ? (currentType === "tv" ? `&first_air_date_year=${currentYear}` : `&primary_release_year=${currentYear}`) : "";
        const ratingParam = currentMinRating ? `&vote_average.gte=${currentMinRating}` : "";
        const genreParam = currentGenreOverride ? `&with_genres=${currentGenreOverride}` : "";
        const base = `https://api.themoviedb.org/3/discover/${currentType}?api_key=${API_KEY}&with_original_language=${currentLang}&sort_by=${currentSort}${yearParam}${ratingParam}${genreParam}`;
        const p = currentPage;
        const [r1, r2, r3] = await Promise.all([
            fetch(`${base}&page=${p}`).then(r => r.json()),
            fetch(`${base}&page=${p + 1}`).then(r => r.json()),
            fetch(`${base}&page=${p + 2}`).then(r => r.json())
        ]);
        totalPages = Math.min(r1.total_pages || 1, 166);
        const results = [...(r1.results||[]), ...(r2.results||[]), ...(r3.results||[])]
            .filter((m, i, a) => m.poster_path && a.findIndex(x => x.id === m.id) === i);
        currentMovies = results.map(m => ({ ...m, _type: currentType === "tv" ? "tv" : "movie" }));
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function loadTrendingMovies(reset = true) {
    currentMode = "trending";
    if (reset) currentPage = 1;
    sectionLabel.textContent = `🔥 Trending ${currentType === "tv" ? "Series" : "Movies"}`;
    loader.style.display = "block";
    try {
        const res = await fetch(`https://api.themoviedb.org/3/trending/${currentType}/day?api_key=${API_KEY}&page=${currentPage}`);
        const data = await res.json();
        currentMovies = data.results;
        totalPages = Math.min(data.total_pages || 1, 500);
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function loadTopRated(reset = true) {
    currentMode = "toprated";
    if (reset) currentPage = 1;
    sectionLabel.textContent = `⭐ Top Rated ${currentType === "tv" ? "Series" : "Movies"}`;
    loader.style.display = "block";
    try {
        const yearParam = currentYear ? (currentType === "tv" ? `&first_air_date_year=${currentYear}` : `&primary_release_year=${currentYear}`) : "";
        const res = await fetch(`https://api.themoviedb.org/3/discover/${currentType}?api_key=${API_KEY}&with_original_language=${currentLang}&sort_by=vote_average.desc&vote_count.gte=100${yearParam}&page=${currentPage}`);
        const data = await res.json();
        currentMovies = data.results;
        totalPages = Math.min(data.total_pages || 1, 500);
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function loadNewReleases(reset = true) {
    currentMode = "newreleases";
    if (reset) currentPage = 1;
    sectionLabel.textContent = "🆕 New Releases";
    loader.style.display = "block";
    const today = new Date().toISOString().split("T")[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_original_language=${currentLang}&primary_release_date.gte=${sixMonthsAgo}&primary_release_date.lte=${today}&sort_by=release_date.desc&page=${currentPage}`);
        const data = await res.json();
        currentMovies = data.results;
        totalPages = Math.min(data.total_pages || 1, 500);
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function loadUpcoming(reset = true) {
    currentMode = "upcoming";
    if (reset) currentPage = 1;
    sectionLabel.textContent = "🔔 Upcoming Movies";
    loader.style.display = "block";
    const today = new Date().toISOString().split("T")[0];
    const sixMonthsAhead = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${today}&primary_release_date.lte=${sixMonthsAhead}&sort_by=popularity.desc&page=${currentPage}`);
        const data = await res.json();
        currentMovies = data.results;
        totalPages = Math.min(data.total_pages || 1, 500);
        renderMovies(currentMovies, true);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function fetchMoviesByGenre(genreId, reset = true) {
    currentMode = "genre";
    currentGenreId = genreId;
    if (reset) currentPage = 1;
    sectionLabel.textContent = `🎭 Genre ${currentType === "tv" ? "Series" : "Movies"}`;
    loader.style.display = "block";
    try {
        const yearParam = currentYear ? (currentType === "tv" ? `&first_air_date_year=${currentYear}` : `&primary_release_year=${currentYear}`) : "";
        const ratingParam = currentMinRating ? `&vote_average.gte=${currentMinRating}` : "";
        const res = await fetch(`https://api.themoviedb.org/3/discover/${currentType}?api_key=${API_KEY}&with_original_language=${currentLang}&with_genres=${genreId}${yearParam}${ratingParam}&sort_by=${currentSort}&page=${currentPage}`);
        const data = await res.json();
        currentMovies = data.results;
        totalPages = Math.min(data.total_pages || 1, 500);
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

async function searchMovies() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) { loadMovies(); return; }
    currentMode = "search";
    sectionLabel.textContent = `🔍 Results for "${query}"`;
    loader.style.display = "block";
    try {
        const [movRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`),
            fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`)
        ]);
        const movData = await movRes.json();
        const tvData = await tvRes.json();
        const movies = (movData.results || []).map(m => ({ ...m, _type: "movie" }));
        const series = (tvData.results || []).map(s => ({ ...s, title: s.name, release_date: s.first_air_date, _type: "tv" }));
        const combined = [...movies, ...series].filter(m => m.poster_path);
        currentMovies = combined.length > 0 ? combined : movies;
        totalPages = 1;
        renderMovies(currentMovies);
        renderPagination();
    } catch (e) { console.error(e); }
    finally { loader.style.display = "none"; }
}

// ===== SURPRISE ME =====
function suggestMovie() {
    if (!currentMovies.length) { showToast("First load some movies!"); return; }
    const movie = currentMovies[Math.floor(Math.random() * currentMovies.length)];
    showToast(`🎲 Suggestion: ${movie.title} (⭐ ${movie.vote_average?.toFixed(1)})`);
    setTimeout(() => { window.location.href = `movie.html?id=${movie.id}`; }, 2000);
}

// ===== RENDER =====
function renderMovies(movies, isUpcoming = false) {
    moviesContainer.innerHTML = "";
    if (!movies || movies.length === 0) {
        moviesContainer.innerHTML = "<p style='padding:20px;text-align:center;'>No movies found.</p>";
        return;
    }
    movies.forEach(movie => displayMovie(movie, isUpcoming));
}

function displayMovie(movie, isUpcoming = false) {
    const poster = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://via.placeholder.com/300x450?text=No+Image";

    const isFav = (JSON.parse(localStorage.getItem("favorites")) || []).find(m => m.id === movie.id);
    const isWL = (JSON.parse(localStorage.getItem("watchLater")) || []).find(m => m.id === movie.id);
    const title = movie.title || movie.name || "";
    const year = (movie.release_date || movie.first_air_date || "").split("-")[0];
    const isTV = movie._type === "tv";
    const detailPage = isTV ? `series.html?id=${movie.id}` : `movie.html?id=${movie.id}`;
    const activeTab = document.querySelector(".type-tab.active")?.id || "";
    const badgeMap = { seriesTab: "Series", tvShowsTab: "TV Show", cartoonsTab: "Cartoon" };
    const badgeLabel = isTV ? (badgeMap[activeTab] || "Series") : "";
    const typeBadge = badgeLabel ? `<span class="type-badge tv">${badgeLabel}</span>` : "";

    const ratings = JSON.parse(localStorage.getItem("tf_ratings")) || {};
    const userRating = ratings[movie.id];
    const ratingBadge = userRating ? `<span class="user-star-badge">⭐ ${userRating}/5</span>` : "";

    let countdownBadge = "";
    if (isUpcoming && movie.release_date) {
        const days = Math.ceil((new Date(movie.release_date) - new Date()) / (1000 * 60 * 60 * 24));
        countdownBadge = days > 0 ? `<span class="countdown-badge">🔔 ${days}d</span>` : "";
    }

    const card = document.createElement("div");
    card.classList.add("movie-card");
    card.innerHTML = `
        <div class="card-poster">
            <img src="${poster}" alt="${title}" loading="lazy">
            ${typeBadge}
            ${countdownBadge}
            <div class="card-overlay">
                <button class="overlay-btn share-btn" title="Share">📤</button>
                <button class="overlay-btn wl-btn ${isWL ? 'active' : ''}" title="Watch Later">🕐</button>
            </div>
        </div>
        <div class="card-body">
            <h3>${title}</h3>
            <div class="card-meta">
                <span class="rating">⭐ ${movie.vote_average?.toFixed(1) || "N/A"}</span>
                <span class="year">${year}</span>
                ${ratingBadge}
            </div>
            <button class="fav-btn ${isFav ? 'active' : ''}">${isFav ? '❤️ Saved' : '🤍 Favorite'}</button>
        </div>
    `;

    card.querySelector(".card-poster").addEventListener("click", () => { addToHistory(movie); window.location.href = detailPage; });
    card.querySelector("h3").addEventListener("click", () => { addToHistory(movie); window.location.href = detailPage; });

    card.querySelector(".fav-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        let favs = JSON.parse(localStorage.getItem("favorites")) || [];
        const exists = favs.find(m => m.id === movie.id);
        if (!exists) {
            favs.push(movie); localStorage.setItem("favorites", JSON.stringify(favs));
            e.target.textContent = "❤️ Saved"; e.target.classList.add("active");
            showToast(`❤️ ${title} added to Favorites!`);
        } else {
            favs = favs.filter(m => m.id !== movie.id); localStorage.setItem("favorites", JSON.stringify(favs));
            e.target.textContent = "🤍 Favorite"; e.target.classList.remove("active");
            showToast(`Removed from Favorites`);
        }
    });

    card.querySelector(".wl-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        let wl = JSON.parse(localStorage.getItem("watchLater")) || [];
        const exists = wl.find(m => m.id === movie.id);
        if (!exists) {
            wl.push(movie); localStorage.setItem("watchLater", JSON.stringify(wl));
            e.target.classList.add("active"); showToast(`🕐 ${title} added to Watch Later!`);
        } else {
            wl = wl.filter(m => m.id !== movie.id); localStorage.setItem("watchLater", JSON.stringify(wl));
            e.target.classList.remove("active"); showToast(`Removed from Watch Later`);
        }
    });

    card.querySelector(".share-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname.replace("index.html", "")}${detailPage}`;
        if (navigator.share) { navigator.share({ title, text: `Check out ${title} on TollyFlix!`, url }); }
        else { navigator.clipboard.writeText(url); showToast(`🔗 Link copied! Share: ${title}`); }
    });

    moviesContainer.appendChild(card);
}

function showFavorites() {
    currentMode = "favorites"; totalPages = 1;
    sectionLabel.textContent = "❤️ My Favorites";
    renderMovies(JSON.parse(localStorage.getItem("favorites")) || []);
    renderPagination();
}

function showWatchLater() {
    currentMode = "watchlater"; totalPages = 1;
    sectionLabel.textContent = "🕐 Watch Later";
    renderMovies(JSON.parse(localStorage.getItem("watchLater")) || []);
    renderPagination();
}

function showHistory() {
    currentMode = "history"; totalPages = 1;
    sectionLabel.textContent = "📜 Recently Viewed";
    renderMovies(JSON.parse(localStorage.getItem("tf_history")) || []);
    renderPagination();
}

function getLangName(code) {
    const names = { te: "Telugu", hi: "Hindi", ta: "Tamil", ml: "Malayalam", kn: "Kannada" };
    return names[code] || code;
}

function getActiveTabLabel() {
    return "Web Series";
}

// ===== AUTH =====
const loggedIn = JSON.parse(localStorage.getItem("tf_loggedIn"));
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

if (loggedIn) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.innerHTML = `<span class="user-greeting" style="cursor:pointer" onclick="window.location.href='profile.html'">👋 Hi, <strong>${loggedIn.name}</strong> 👤</span>`;
}

logoutBtn?.addEventListener("click", () => { localStorage.removeItem("tf_loggedIn"); window.location.reload(); });

// ===== THEME =====
const themeBtn = document.getElementById("themeBtn");
if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
    if (themeBtn) themeBtn.innerHTML = "🌙 Dark Mode";
}
themeBtn?.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    themeBtn.innerHTML = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
});

// ===== TYPE TABS =====
function setActiveTab(tabId) {
    ["moviesTab", "seriesTab"].forEach(id => document.getElementById(id)?.classList.remove("active"));
    document.getElementById(tabId)?.classList.add("active");
}

document.getElementById("moviesTab")?.addEventListener("click", function () {
    currentType = "movie"; currentGenreOverride = "";
    setActiveTab("moviesTab");
    document.getElementById("genreFilter").value = "all";
    loadMovies();
});
document.getElementById("seriesTab")?.addEventListener("click", function () {
    currentType = "tv"; currentGenreOverride = "";
    setActiveTab("seriesTab");
    document.getElementById("genreFilter").value = "all";
    loadMovies();
});

// ===== EVENT LISTENERS =====
document.getElementById("searchBtn")?.addEventListener("click", searchMovies);
document.getElementById("searchInput")?.addEventListener("keypress", e => { if (e.key === "Enter") searchMovies(); });
document.getElementById("trendingBtn")?.addEventListener("click", () => loadTrendingMovies());
document.getElementById("topRatedBtn")?.addEventListener("click", () => loadTopRated());
document.getElementById("newReleasesBtn")?.addEventListener("click", () => loadNewReleases());
document.getElementById("upcomingBtn")?.addEventListener("click", () => loadUpcoming());
document.getElementById("historyBtn")?.addEventListener("click", showHistory);
document.getElementById("suggestBtn")?.addEventListener("click", suggestMovie);
document.getElementById("favoritesBtn")?.addEventListener("click", showFavorites);
document.getElementById("watchLaterBtn")?.addEventListener("click", showWatchLater);

document.getElementById("langFilter")?.addEventListener("change", function () { currentLang = this.value; document.getElementById("genreFilter").value = "all"; loadMovies(); });
document.getElementById("yearFilter")?.addEventListener("change", function () { currentYear = this.value; document.getElementById("genreFilter").value = "all"; loadMovies(); });
document.getElementById("genreFilter")?.addEventListener("change", function () { if (this.value === "all") loadMovies(); else fetchMoviesByGenre(this.value); });
document.getElementById("ratingFilter")?.addEventListener("change", () => loadMovies());
document.getElementById("sortFilter")?.addEventListener("change", () => loadMovies());

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const key = e.key.toLowerCase();
    if (key === "/") { e.preventDefault(); document.getElementById("searchInput").focus(); }
    else if (key === "t") loadTrendingMovies();
    else if (key === "f") showFavorites();
    else if (key === "w") showWatchLater();
    else if (key === "h") showHistory();
    else if (key === "u") loadUpcoming();
    else if (key === "s") suggestMovie();
    else if (key === "escape") document.getElementById("searchInput").blur();
});

// ===== INIT =====
loadMovies();
