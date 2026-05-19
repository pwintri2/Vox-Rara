# Vox Rara

Repository voor de website en ondersteunende tools van **Vox Rara**: een klein, ambitieus koorproject rond een gedragen, homogene ensembleklank.

De publieke website staat op: <https://vox-rara.nl>

## Wat staat er in deze repository?

Deze repository bevat een statische website met enkele PHP-onderdelen voor beheer en repetitieondersteuning.

Belangrijke onderdelen:

- `index.html` — startpagina met toegang tot de Vox Rara-site en de stage-/auditieaanmelding.
- `vox-rara-wintrip-projects.htm` — hoofdlandingspagina voor Vox Rara met informatie over het koor, de dirigent, auditie en projectplanning.
- `Stage/aanmelden-stagiair.html` — aanmeldpagina voor stages.
- `leden/` — leden- en aanmeldmodule met HTML, CSS, JavaScript, PHP API en MariaDB-schema.
- `oefenen/` — partituur-oefenaar voor koorleden, inclusief MusicXML/MXL-upload en scorebeheer via PHP.
- `studio/` — eenvoudige studio-/bibliotheekpagina met iframe naar de koorbibliotheek.
- `promo/` — lokale promotie-assistent voor Wintrip Projects.
- `assets/`, `Portal/`, `cv/` en `vox-rara-wintrip-projects_files/` — afbeeldingen, logo's, media en ondersteunende pagina's.

## Doel van de site

De site presenteert Vox Rara aan zangers, geïnteresseerden en projectdeelnemers. De nadruk ligt op:

- auditie en aanmelding voor zangers;
- informatie over dirigent Philip Wintrip;
- projectcommunicatie rond repetities en concerten;
- ledenbeheer en toegang voor beheer;
- oefenen met partituren en stemmateriaal.

## Lokaal bekijken

Voor de statische pagina's is geen buildstap nodig. Open bijvoorbeeld:

```text
index.html
```

in een browser, of serveer de map lokaal met een eenvoudige webserver.

Let op: sommige pagina's gebruiken absolute paden, externe embeds of PHP-endpoints. Die werken volledig pas wanneer de site onder de juiste domeinstructuur en serverconfiguratie draait.

## Serverconfiguratie

Voor de PHP-modules zijn lokale configuratiebestanden nodig die bewust niet worden meegecommit:

- kopieer `leden/db_config.example.php` naar `leden/db_config.php` en vul de MariaDB-gegevens en het beheerderswachtwoord in;
- kopieer `oefenen/scores_config.example.php` naar `oefenen/scores_config.php` en vul de databasegegevens in.

Deze bestanden staan in `.gitignore`, omdat ze gevoelige gegevens bevatten.

## Database

De ledenmodule gebruikt het schema in:

```text
leden/leden_schema.sql
```

De oefenmodule maakt de tabel voor scores aan via `oefenen/api_scores.php` wanneer de databaseverbinding beschikbaar is.

## Beheer van wijzigingen

Houd deze README in de `main`-branch van de repository. Maak geen aparte documentatiebranch aan voor deze README.
