# Vox Rara

Repository voor de website en ondersteunende webpagina's van **Vox Rara**.

Website: [vox-rara.nl](https://vox-rara.nl)

## Over Vox Rara

Vox Rara is een klein, ambitieus koorproject onder leiding van Philip Wintrip. De site richt zich op zangers die muzikaal zelfstandig zijn en zich willen verbinden aan een hechte SATB-bezetting met aandacht voor klank, balans en ensemblezang.

De website bevat informatie over het koor, auditie en aanmelding, projectinformatie, luister- en videofragmenten en een aantal ondersteunende pagina's voor leden, stage-aanmelding en oefenmateriaal.

## Inhoud van deze repository

Belangrijke onderdelen:

- `index.html` - startpagina/portal van de website.
- `vox-rara-wintrip-projects.htm` - hoofdlandingspagina voor Vox Rara met projectinformatie, auditie-informatie, media en aanmeldknoppen.
- `leden/` - leden- en aanmeldmodule met PHP-backend, beheerpagina's, database-schema en voorbeeldconfiguratie.
- `oefenen/` - oefenomgeving voor bladmuziek en MusicXML/MXL-bestanden.
- `studio/` - Vox Rara Studio-pagina met ingesloten koorbibliotheek.
- `Stage/` - stage-aanmeldpagina.
- `promo/` - aparte promotietool voor Wintrip Projects.
- `assets/`, `cv/assets/` en `vox-rara-wintrip-projects_files/` - afbeeldingen, logo's, stylesheets, scripts en overige media-assets.

## Techniek

De repository bestaat hoofdzakelijk uit statische HTML, CSS en JavaScript, aangevuld met PHP-endpoints voor onderdelen die opslag of beheer nodig hebben.

Gebruikte onderdelen:

- HTML/CSS/JavaScript voor de publieke pagina's.
- PHP met PDO voor ledenbeheer en score-upload.
- MariaDB/MySQL voor de leden- en oefenmodules.
- Externe media-insluitingen, waaronder Vimeo-video's en een externe koorbibliotheek.

## Configuratie

Voor server-specifieke instellingen staan voorbeeldbestanden in de repository. Kopieer deze op de server naar de echte configuratiebestanden en vul daar de private gegevens in.

- `leden/db_config.example.php` -> `leden/db_config.php`
- `oefenen/scores_config.example.php` -> `oefenen/scores_config.php`

Commit geen echte databasegegevens, wachtwoorden of andere secrets naar de repository.

## Lokaal bekijken

Voor de statische pagina's is geen buildproces nodig. Open bijvoorbeeld `index.html` in een browser, of serveer de repository lokaal met een eenvoudige webserver:

```bash
php -S localhost:8000
```

Open daarna `http://localhost:8000` in je browser.

Let op: PHP-modules met databasefunctionaliteit werken lokaal alleen wanneer de bijbehorende configuratie en database beschikbaar zijn.

## Beheer en onderhoud

- Houd publieke content actueel op de hoofdlandingspagina `vox-rara-wintrip-projects.htm`.
- Plaats serverconfiguratie alleen in lokale, genegeerde configbestanden.
- Controleer formulieren, media-links en aanmeldroutes na wijzigingen.
- Gebruik de voorbeeldconfiguraties als basis voor nieuwe omgevingen.

## Licentie

Zie [`LICENSE`](LICENSE).
