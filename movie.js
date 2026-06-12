const API_KEY = "414fa9cd1d5abe3a521d0c8b4d8d9d2a";
const movieId = new URLSearchParams(window.location.search).get("id");
const loader = document.getElementById("loader");

function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function renderStars(movieId) {
    const ratings = JSON.parse(localStorage.getItem("tf_ratings")) || {};
    const current = ratings[movieId] || 0;
    let html = `<div class="star-rating" id="starRating">`;
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= current ? 'filled' : ''}" data-val="${i}">★</span>`;
    }
    html += current ? `<span class="star-label">Your Rating: ${current}/5</span>` : `<span class="star-label">Rate this</span>`;
    html += `</div>`;
    return html;
}

function bindStars(movieId) {
    document.querySelectorAll(".star").forEach(star => {
        star.addEventListener("click", () => {
            const val = parseInt(star.dataset.val);
            const ratings = JSON.parse(localStorage.getItem("tf_ratings")) || {};
            ratings[movieId] = val;
            localStorage.setItem("tf_ratings", JSON.stringify(ratings));
            document.getElementById("starRating").outerHTML = renderStars(movieId);
            bindStars(movieId);
            showToast(`⭐ Rated ${val}/5!`);
        });
        star.addEventListener("mouseover", () => {
            const val = parseInt(star.dataset.val);
            document.querySelectorAll(".star").forEach((s, i) => s.classList.toggle("hover", i < val));
        });
        star.addEventListener("mouseout", () => {
            document.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
        });
    });
}

async function loadMovie() {
    showLoader();
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`);
        const movie = await res.json();

        const poster = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "https://via.placeholder.com/300x450?text=No+Image";

        const genres = movie.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join("") || "";

        document.getElementById("movieDetails").innerHTML = `
            <div class="details-container">
                <div class="poster-col">
                    <img src="${poster}" alt="${movie.title}">
                </div>
                <div class="details-info">
                    <h1>${movie.title}</h1>
                    <div class="genre-tags">${genres}</div>
                    <p><strong>📅 Release Date:</strong> ${movie.release_date || "N/A"}</p>
                    <p><strong>⭐ Rating:</strong> ${movie.vote_average?.toFixed(1)} / 10 (${movie.vote_count} votes)</p>
                    <p><strong>⏱️ Runtime:</strong> ${movie.runtime} mins</p>
                    <p><strong>🌐 Language:</strong> ${movie.original_language?.toUpperCase()}</p>
                    <p><strong>🔥 Popularity:</strong> ${movie.popularity?.toFixed(0)}</p>
                    ${renderStars(movie.id)}
                    <h3>📖 Story</h3>
                    <p>${movie.overview || "No description available."}</p>
                </div>
                <div class="ott-col" id="ottInline">
                    <p style="color:#aaa;font-size:13px;">⏳ Loading...</p>
                </div>
            </div>
        `;
        document.title = `${movie.title} - TollyFlix`;
        bindStars(movie.id);
    } catch (err) {
        document.getElementById("movieDetails").innerHTML = "<p>Failed to load movie details.</p>";
    } finally {
        hideLoader();
    }

    loadWatchProviders();
    loadTrailer();
    loadCast();
    loadSimilarMovies();
}

async function loadWatchProviders() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${API_KEY}`);
        const data = await res.json();

        const region = data.results?.IN || data.results?.US;
        const target = document.getElementById("ottInline");

        const ottLinks = {
            "Netflix": "https://www.netflix.com/search?q=",
            "Amazon Prime Video": "https://www.primevideo.com/search/ref=atv_nb_sr?phrase=",
            "Disney+ Hotstar": "https://www.hotstar.com/in/search?q=",
            "Hotstar": "https://www.hotstar.com/in/search?q=",
            "ZEE5": "https://www.zee5.com/search?q=",
            "SonyLIV": "https://www.sonyliv.com/search?q=",
            "Aha": "https://www.aha.video/search?q=",
            "Sun NXT": "https://www.sunnxt.com/search?searchterm=",
            "MX Player": "https://www.mxplayer.in/search?q=",
            "JioCinema": "https://www.jiocinema.com/search?q=",
            "Mubi": "https://mubi.com/search/",
            "Apple TV": "https://tv.apple.com/search?term="
        };

        const titleEl = document.querySelector(".details-info h1");
        const movieTitle = titleEl ? encodeURIComponent(titleEl.textContent.trim()) : "";

        let html = "";

        if (region) {
            const allProviders = [
                ...(region.flatrate || []),
                ...(region.rent || []),
                ...(region.buy || [])
            ];

            const unique = allProviders.filter((p, i, self) =>
                i === self.findIndex(x => x.provider_id === p.provider_id)
            );

            if (unique.length > 0) {
                html += `<div class="ott-inline-title">📺 Where to Watch</div><div class="ott-inline">`;

                unique.forEach(p => {
                    const logo = `https://image.tmdb.org/t/p/w92${p.logo_path}`;
                    const link = ottLinks[p.provider_name]
                        ? ottLinks[p.provider_name] + movieTitle
                        : region.link || "#";
                    const isStream = (region.flatrate || []).find(x => x.provider_id === p.provider_id);
                    const badge = isStream
                        ? `<span class="ott-badge stream">Stream</span>`
                        : `<span class="ott-badge rent">Rent</span>`;

                    html += `
                        <a href="${link}" target="_blank" class="ott-pill" title="${p.provider_name}">
                            <img src="${logo}" alt="${p.provider_name}">
                            <span>${p.provider_name}</span>
                            ${badge}
                        </a>`;
                });

                html += `</div>`;
            } else {
                html += `<p style="color:#aaa;font-size:13px;margin:12px 0;">📺 Not available on streaming platforms.</p>`;
            }
        } else {
            html += `<p style="color:#aaa;font-size:13px;margin:12px 0;">📺 Not available in your region.</p>`;
        }

        // Spotify — always show
        const spotifyUrl = `https://open.spotify.com/search/${movieTitle}%20songs`;
        html += `
            <div class="ott-inline-title" style="margin-top:15px;">🎵 Songs</div>
            <div class="ott-inline">
                <a href="${spotifyUrl}" target="_blank" class="ott-pill spotify-pill">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/168px-Spotify_logo_without_text.svg.png" alt="Spotify">
                    <span>Listen on Spotify</span>
                    <span class="ott-badge stream">Songs</span>
                </a>
            </div>`;

        target.innerHTML = html;

    } catch (err) {
        const target = document.getElementById("ottInline");
        if (target) target.innerHTML = "";
    }
}

async function loadTrailer() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}`);
        const data = await res.json();

        const trailer = data.results?.find(v => v.site === "YouTube" && v.type === "Trailer");

        if (!trailer) {
            document.getElementById("trailerContainer").innerHTML = "<p style='text-align:center;padding:20px;'>🎬 Trailer Not Available</p>";
            return;
        }

        document.getElementById("trailerContainer").innerHTML = `
            <div class="section-title">🎬 Official Trailer</div>
            <div class="trailer-wrapper">
                <iframe
                    src="https://www.youtube.com/embed/${trailer.key}?rel=0"
                    title="Movie Trailer"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        `;
    } catch (err) {
        document.getElementById("trailerContainer").innerHTML = "<p>Trailer load failed.</p>";
    }
}

async function loadCast() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`);
        const data = await res.json();

        if (!data.cast || data.cast.length === 0) {
            document.getElementById("castContainer").innerHTML = "<p>No cast info available.</p>";
            return;
        }

        let html = `<div class="section-title">🎭 Cast & Crew</div><div class="cast-container">`;

        data.cast.slice(0, 12).forEach(actor => {
            const photo = actor.profile_path
                ? `https://image.tmdb.org/t/p/w200${actor.profile_path}`
                : "https://via.placeholder.com/200x300?text=No+Photo";

            html += `
                <div class="cast-card" onclick="window.location.href='person.html?id=${actor.id}'">
                    <img src="${photo}" alt="${actor.name}" loading="lazy">
                    <h4>${actor.name}</h4>
                    <p>${actor.character || ""}</p>
                </div>
            `;
        });

        html += `</div>`;
        document.getElementById("castContainer").innerHTML = html;
    } catch (err) {
        document.getElementById("castContainer").innerHTML = `<p>Cast load failed: ${err.message}</p>`;
    }
}

async function loadSimilarMovies() {
    try {
        const [recRes, movieRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${API_KEY}`),
            fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`)
        ]);
        const recData = await recRes.json();
        const movieData = await movieRes.json();

        const lang = movieData.original_language || "te";

        let movies = (recData.results || []).filter(m => m.poster_path && m.original_language === lang);

        // If not enough recommendations, fetch discover with same language
        if (movies.length < 6) {
            const discoverRes = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_original_language=${lang}&sort_by=popularity.desc&with_genres=${movieData.genres?.map(g=>g.id).join(",")}`);
            const discoverData = await discoverRes.json();
            const extra = (discoverData.results || []).filter(m => m.poster_path && m.id !== parseInt(movieId) && !movies.find(x => x.id === m.id));
            movies = [...movies, ...extra];
        }

        // If part of a collection (franchise), add those first
        if (movieData.belongs_to_collection) {
            const colRes = await fetch(`https://api.themoviedb.org/3/collection/${movieData.belongs_to_collection.id}?api_key=${API_KEY}`);
            const colData = await colRes.json();
            const colMovies = (colData.parts || []).filter(m => m.poster_path && m.id !== parseInt(movieId));
            movies = [...colMovies, ...movies.filter(m => !colMovies.find(c => c.id === m.id))];
        }

        movies = movies.slice(0, 12);

        if (movies.length === 0) {
            document.getElementById("similarMovies").innerHTML = "<p style='padding:20px;'>No related movies found.</p>";
            return;
        }

        let html = `<div class="section-title">🎬 You May Also Like</div><div class="similar-container">`;

        movies.forEach(movie => {
            const year = movie.release_date ? movie.release_date.split("-")[0] : "";
            html += `
                <div class="similar-card" onclick="window.location.href='movie.html?id=${movie.id}'">
                    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title}" loading="lazy">
                    <p>${movie.title}</p>
                    <small>⭐ ${movie.vote_average?.toFixed(1)}${year ? " · " + year : ""}</small>
                </div>
            `;
        });

        html += `</div>`;
        document.getElementById("similarMovies").innerHTML = html;
    } catch (err) {
        document.getElementById("similarMovies").innerHTML = `<p>Related movies load failed: ${err.message}</p>`;
    }
}

if (movieId) {
    loadMovie();
} else {
    document.getElementById("movieDetails").innerHTML = "<p>No movie selected.</p>";
}

if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
}

document.getElementById("shareMovieBtn")?.addEventListener("click", () => {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: document.title, url });
    } else {
        navigator.clipboard.writeText(url);
        showToast("🔗 Link copied to clipboard!");
    }
});

document.getElementById("wlMovieBtn")?.addEventListener("click", async () => {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`);
    const movie = await res.json();
    let wl = JSON.parse(localStorage.getItem("watchLater")) || [];
    const exists = wl.find(m => m.id === movie.id);
    if (!exists) {
        wl.push(movie);
        localStorage.setItem("watchLater", JSON.stringify(wl));
        showToast("🕐 Added to Watch Later!");
    } else {
        showToast("Already in Watch Later!");
    }
});
