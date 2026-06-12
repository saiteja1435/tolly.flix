$css = Get-Content "style.css" -Raw

$old = @"
    display: flex;

    gap: 40px;
    max-width: 1100px;
    margin: 30px auto;
    padding: 20px;
    align-items: flex-start;

}

.poster-col {

    flex-shrink: 0;
    width: 280px;

    display: flex;
    flex-direction: column;

    gap: 15px;

}


.poster-col > img {
    width: 100%;

    border-radius: 15px;

    box-shadow: 0 10px 30px rgba(255,0,0,0.3);

    display: block;

}

.details-container > img {
    width: 280px;
    border-radius: 15px;
    flex-shrink: 0;
    box-shadow: 0 10px 30px rgba(255,0,0,0.3);
}


.details-info { flex: 1; min-width: 250px; }
"@

$new = @"
    display: flex;
    gap: 30px;
    max-width: 1200px;
    margin: 30px auto;
    padding: 20px;
    align-items: flex-start;
}

.poster-col {
    flex-shrink: 0;
    width: 260px;
}

.poster-col > img {
    width: 100%;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(255,0,0,0.3);
    display: block;
}

.details-container > img {
    width: 260px;
    border-radius: 15px;
    flex-shrink: 0;
    box-shadow: 0 10px 30px rgba(255,0,0,0.3);
}

.details-info { flex: 1; min-width: 0; }

.ott-col {
    flex-shrink: 0;
    width: 190px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 5px;
}
"@

$css = $css.Replace($old, $new)
Set-Content "style.css" $css
Write-Host "Done"
