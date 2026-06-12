const API_KEY = "414fa9cd1d5abe3a521d0c8b4d8d9d2a";
const personId = new URLSearchParams(window.location.search).get("id");

async function loadPerson() {
    document.getElementById("loader").style.display = "block";

    const [personRes, creditsRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/person/${personId}?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${API_KEY}`)
    ]);

    const person = await personRes.json();
    const credits = await creditsRes.json();

    document.getElementById("loader").style.display = "none";

    const photo = person.profile_path
        ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
        : "https://via.placeholder.com/300x450?text=No+Image";

    const age = person.birthday
        ? Math.floor((new Date() - new Date(person.birthday)) / (365.25 * 24 * 60 * 60 * 1000))
        : "N/A";

    document.getElementById("personDetails").innerHTML = `
        <div class="person-hero">
            <img src="${photo}" alt="${person.name}" class="person-photo">
            <div class="person-info">
                <h1>${person.name}</h1>
                <p><strong>🎂 Date of Birth:</strong> ${person.birthday || "Unknown"}${person.birthday ? ` (Age: ${age})` : ""}</p>
                ${person.deathday ? `<p><strong>💀 Date of Death:</strong> ${person.deathday}</p>` : ""}
                <p><strong>🌍 Place of Birth:</strong> ${person.place_of_birth || "Unknown"}</p>
                <p><strong>🎭 Known For:</strong> ${person.known_for_department || "Acting"}</p>
                <p><strong>⭐ Popularity:</strong> ${person.popularity?.toFixed(1)}</p>
                ${person.biography ? `<h3>About</h3><p class="bio">${person.biography}</p>` : ""}
            </div>
        </div>
    `;

    const sorted = (credits.cast || [])
        .filter(m => m.poster_path)
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        .slice(0, 12);

    let moviesHTML = `<div class="person-movies-section"><h2>🎬 Known Movies</h2><div class="similar-container">`;

    sorted.forEach(movie => {
        moviesHTML += `
            <div class="similar-card" onclick="window.location.href='movie.html?id=${movie.id}'">
                <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title}">
                <p>${movie.title}</p>
                <small>${movie.release_date?.split("-")[0] || ""}</small>
            </div>
        `;
    });

    moviesHTML += `</div></div>`;
    document.getElementById("personMovies").innerHTML = moviesHTML;
}

loadPerson();
