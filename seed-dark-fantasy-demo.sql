\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    users_count integer;
BEGIN
    SELECT COUNT(*)
    INTO users_count
    FROM users;

    IF users_count < 2 THEN
        RAISE EXCEPTION 'Expected at least 2 local users, found %', users_count;
    END IF;
END $$;

DO $$
DECLARE
    business_data_count integer;
BEGIN
    SELECT
        (SELECT COUNT(*) FROM competitors) +
        (SELECT COUNT(*) FROM teams) +
        (SELECT COUNT(*) FROM races) +
        (SELECT COUNT(*) FROM race_registrations) +
        (SELECT COUNT(*) FROM race_results)
    INTO business_data_count;

    IF business_data_count > 0 THEN
        RAISE EXCEPTION 'Seed aborted because business data already exists. Clean the database first or use a new seed strategy.';
    END IF;
END $$;

CREATE TEMP TABLE demo_context (
    admin_user_id uuid NOT NULL,
    organizer_user_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_context (
    admin_user_id,
    organizer_user_id
)
SELECT
    (SELECT id FROM users ORDER BY id LIMIT 1),
    (SELECT id FROM users ORDER BY id OFFSET 1 LIMIT 1);

DO $$
DECLARE
    admin_id uuid;
    organizer_id uuid;
BEGIN
    SELECT
        admin_user_id,
        organizer_user_id
    INTO
        admin_id,
        organizer_id
    FROM demo_context;

    IF admin_id IS NULL OR organizer_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve two users for demo ownership.';
    END IF;
END $$;

INSERT INTO competitors (
    id,
    approximate_age,
    competitor_type,
    completed_races,
    date_of_birth,
    defeats,
    height_cm,
    name,
    nickname,
    origin,
    registration_date,
    status,
    victories,
    weight_kg
) VALUES
(
    '10000000-0000-0000-0000-000000000001'::uuid,
    19,
    'DWARF',
    1,
    NULL::date,
    0,
    158.00::numeric,
    'Rei Hinasaki',
    'Shadow Lens',
    'Himuro Mansion',
    '2026-08-20 09:00:00'::timestamp,
    'ACTIVE',
    1,
    49.00::numeric
),
(
    '10000000-0000-0000-0000-000000000002'::uuid,
    20,
    'MEDIUM',
    1,
    NULL::date,
    1,
    165.00::numeric,
    'Alice Liddell',
    'Vorpal Bloom',
    'Wonderland Asylum',
    '2026-08-20 09:05:00'::timestamp,
    'ACTIVE',
    0,
    54.00::numeric
),
(
    '10000000-0000-0000-0000-000000000003'::uuid,
    30,
    'CAMEL',
    1,
    NULL::date,
    1,
    178.00::numeric,
    'Solaire of Astora',
    'Sun Seeker',
    'Anor Londo',
    '2026-08-20 09:10:00'::timestamp,
    'ACTIVE',
    0,
    82.00::numeric
),
(
    '10000000-0000-0000-0000-000000000004'::uuid,
    27,
    'MEDIUM',
    1,
    NULL::date,
    1,
    170.00::numeric,
    'Lady Maria',
    'Bloodborne Rose',
    'Astral Clocktower',
    '2026-08-20 09:15:00'::timestamp,
    'ACTIVE',
    0,
    58.00::numeric
),
(
    '10000000-0000-0000-0000-000000000005'::uuid,
    32,
    'CAMEL',
    1,
    NULL::date,
    0,
    181.00::numeric,
    'Duchess',
    'Nightreign Warden',
    'Limveld',
    '2026-08-20 09:20:00'::timestamp,
    'ACTIVE',
    1,
    76.00::numeric
),
(
    '10000000-0000-0000-0000-000000000006'::uuid,
    29,
    'DWARF',
    1,
    NULL::date,
    0,
    162.00::numeric,
    'Revenant',
    'Gravebound Arrow',
    'Limveld',
    '2026-08-20 09:25:00'::timestamp,
    'ACTIVE',
    1,
    60.00::numeric
),
(
    '10000000-0000-0000-0000-000000000007'::uuid,
    31,
    'CAMEL',
    1,
    NULL::date,
    1,
    184.00::numeric,
    'The Bearer of the Curse',
    'Hollow Flame',
    'Drangleic',
    '2026-08-20 09:30:00'::timestamp,
    'ACTIVE',
    0,
    88.00::numeric
),
(
    '10000000-0000-0000-0000-000000000008'::uuid,
    25,
    'MEDIUM',
    1,
    NULL::date,
    1,
    168.00::numeric,
    'Fire Keeper',
    'Ashen Oracle',
    'Firelink Shrine',
    '2026-08-20 09:35:00'::timestamp,
    'ACTIVE',
    0,
    55.00::numeric
);

INSERT INTO teams (
    id,
    coach_name,
    created_at,
    defeats,
    description,
    name,
    status,
    victories
) VALUES
(
    '20000000-0000-0000-0000-000000000001'::uuid,
    'The Nightlord',
    '2026-08-21 10:00:00'::timestamp,
    0,
    'A Limveld caravan that crosses cursed dunes under moonless skies.',
    'Nightreign Dune Wardens',
    'ACTIVE',
    1
),
(
    '20000000-0000-0000-0000-000000000002'::uuid,
    'Emerald Herald',
    '2026-08-21 10:05:00'::timestamp,
    1,
    'A Drangleic caravan guided by embers, memory and hollow resolve.',
    'Darksign Caravan',
    'ACTIVE',
    0
),
(
    '20000000-0000-0000-0000-000000000003'::uuid,
    'Cheshire Cat',
    '2026-08-21 10:10:00'::timestamp,
    1,
    'A crimson courier team that navigates fractured paths through Wonderland.',
    'Crimson Wonderland Couriers',
    'ACTIVE',
    0
);

INSERT INTO team_members (
    id,
    active,
    joined_at,
    left_at,
    competitor_id,
    team_id
) VALUES
(
    '30000000-0000-0000-0000-000000000001'::uuid,
    TRUE,
    '2026-08-22 10:00:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000005'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid
),
(
    '30000000-0000-0000-0000-000000000002'::uuid,
    TRUE,
    '2026-08-22 10:01:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000006'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid
),
(
    '30000000-0000-0000-0000-000000000003'::uuid,
    TRUE,
    '2026-08-22 10:02:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000007'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid
),
(
    '30000000-0000-0000-0000-000000000004'::uuid,
    TRUE,
    '2026-08-22 10:03:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000008'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid
),
(
    '30000000-0000-0000-0000-000000000005'::uuid,
    TRUE,
    '2026-08-22 10:04:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid
),
(
    '30000000-0000-0000-0000-000000000006'::uuid,
    TRUE,
    '2026-08-22 10:05:00'::timestamp,
    NULL::timestamp,
    '10000000-0000-0000-0000-000000000004'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid
);

INSERT INTO races (
    id,
    created_at,
    description,
    distance_meters,
    finish_location,
    max_participants,
    name,
    race_type,
    registration_deadline,
    scheduled_at,
    start_location,
    status,
    updated_at,
    organizer_id
) VALUES
(
    '40000000-0000-0000-0000-000000000001'::uuid,
    '2026-08-25 08:00:00'::timestamp,
    'A lantern-lit individual sprint from the mansion gate to the drowned torii.',
    4200.00::numeric,
    'Drowned Torii Gate',
    12,
    'Himuro Lantern Sprint',
    'INDIVIDUAL',
    '2026-08-26 18:00:00'::timestamp,
    '2026-08-27 20:00:00'::timestamp,
    'Himuro Mansion Gate',
    'COMPLETED',
    '2026-08-27 22:00:00'::timestamp,
    (SELECT organizer_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000002'::uuid,
    '2026-08-28 08:00:00'::timestamp,
    'A team relay through the ash dunes where every handoff must survive the storm.',
    7800.00::numeric,
    'Smoldering Watchtower',
    8,
    'Ashen Dunes Relay',
    'TEAM',
    '2026-08-29 18:00:00'::timestamp,
    '2026-08-30 19:00:00'::timestamp,
    'Ashen Caravan Camp',
    'COMPLETED',
    '2026-08-30 22:00:00'::timestamp,
    (SELECT organizer_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000003'::uuid,
    '2026-09-01 08:00:00'::timestamp,
    'A mixed circuit where lone riders and caravans race beneath a fractured eclipse.',
    6200.00::numeric,
    'Queen of Hearts Observatory',
    14,
    'Wonderland Eclipse Circuit',
    'MIXED',
    '2026-09-03 18:00:00'::timestamp,
    '2026-09-04 20:00:00'::timestamp,
    'Mad Hatter Crossroads',
    'IN_PROGRESS',
    '2026-09-04 20:10:00'::timestamp,
    (SELECT organizer_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-05 08:00:00'::timestamp,
    'A mixed night race across Limveld ruins with registration still open.',
    9000.00::numeric,
    'Nightlord Ruins',
    16,
    'Limveld Nightfall Cup',
    'MIXED',
    '2026-09-20 18:00:00'::timestamp,
    '2026-09-22 21:00:00'::timestamp,
    'Roundtable Dune Camp',
    'OPEN_FOR_REGISTRATION',
    '2026-09-05 08:00:00'::timestamp,
    (SELECT organizer_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000005'::uuid,
    '2026-09-06 08:00:00'::timestamp,
    'A draft individual trial through the ash around Firelink Shrine.',
    3600.00::numeric,
    'Kiln Approach',
    10,
    'Firelink Ember Trial',
    'INDIVIDUAL',
    '2026-10-01 18:00:00'::timestamp,
    '2026-10-03 19:00:00'::timestamp,
    'Firelink Shrine',
    'DRAFT',
    '2026-09-06 08:00:00'::timestamp,
    (SELECT admin_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000006'::uuid,
    '2026-09-07 08:00:00'::timestamp,
    'A draft individual course reserved for a manual race creation demonstration.',
    5100.00::numeric,
    'Vileblood Overlook',
    12,
    'Cainhurst Bloodmoon Trial',
    'INDIVIDUAL',
    '2026-10-10 18:00:00'::timestamp,
    '2026-10-12 20:00:00'::timestamp,
    'Cainhurst Courtyard',
    'DRAFT',
    '2026-09-07 08:00:00'::timestamp,
    (SELECT organizer_user_id FROM demo_context)
),
(
    '40000000-0000-0000-0000-000000000007'::uuid,
    '2026-09-08 08:00:00'::timestamp,
    'A draft team route for a manual team race demonstration.',
    11000.00::numeric,
    'Ash Lake Shore',
    10,
    'Ash Lake Covenant Run',
    'TEAM',
    '2026-10-15 18:00:00'::timestamp,
    '2026-10-17 20:00:00'::timestamp,
    'Great Hollow Entrance',
    'DRAFT',
    '2026-09-08 08:00:00'::timestamp,
    (SELECT admin_user_id FROM demo_context)
);

INSERT INTO race_registrations (
    id,
    registered_at,
    starting_position,
    status,
    validation_notes,
    competitor_id,
    race_id,
    registered_by_user_id,
    team_id
) VALUES
(
    '50000000-0000-0000-0000-000000000001'::uuid,
    '2026-08-26 09:00:00'::timestamp,
    1,
    'APPROVED',
    'Approved for the lantern sprint.',
    '10000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000002'::uuid,
    '2026-08-26 09:05:00'::timestamp,
    2,
    'APPROVED',
    'Approved for the lantern sprint.',
    '10000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000003'::uuid,
    '2026-08-26 09:10:00'::timestamp,
    3,
    'APPROVED',
    'Approved for the lantern sprint.',
    '10000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000004'::uuid,
    '2026-08-26 09:15:00'::timestamp,
    4,
    'APPROVED',
    'Approved for the lantern sprint.',
    '10000000-0000-0000-0000-000000000004'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000005'::uuid,
    '2026-08-29 09:00:00'::timestamp,
    1,
    'APPROVED',
    'Approved for the relay.',
    NULL::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000001'::uuid
),
(
    '50000000-0000-0000-0000-000000000006'::uuid,
    '2026-08-29 09:05:00'::timestamp,
    2,
    'APPROVED',
    'Approved for the relay.',
    NULL::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000002'::uuid
),
(
    '50000000-0000-0000-0000-000000000007'::uuid,
    '2026-08-29 09:10:00'::timestamp,
    3,
    'APPROVED',
    'Approved for the relay.',
    NULL::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000003'::uuid
),
(
    '50000000-0000-0000-0000-000000000008'::uuid,
    '2026-09-03 09:00:00'::timestamp,
    1,
    'APPROVED',
    'Approved for the eclipse circuit.',
    '10000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000009'::uuid,
    '2026-09-03 09:05:00'::timestamp,
    2,
    'APPROVED',
    'Approved for the eclipse circuit.',
    '10000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000010'::uuid,
    '2026-09-03 09:10:00'::timestamp,
    3,
    'APPROVED',
    'Approved for the eclipse circuit.',
    NULL::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000001'::uuid
),
(
    '50000000-0000-0000-0000-000000000011'::uuid,
    '2026-09-03 09:15:00'::timestamp,
    4,
    'APPROVED',
    'Approved for the eclipse circuit.',
    NULL::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    (SELECT organizer_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000002'::uuid
),
(
    '50000000-0000-0000-0000-000000000012'::uuid,
    '2026-09-10 09:00:00'::timestamp,
    NULL::integer,
    'PENDING',
    NULL::text,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000004'::uuid,
    (SELECT admin_user_id FROM demo_context),
    NULL::uuid
),
(
    '50000000-0000-0000-0000-000000000013'::uuid,
    '2026-09-10 09:05:00'::timestamp,
    NULL::integer,
    'PENDING',
    NULL::text,
    NULL::uuid,
    '40000000-0000-0000-0000-000000000004'::uuid,
    (SELECT admin_user_id FROM demo_context),
    '20000000-0000-0000-0000-000000000003'::uuid
);

INSERT INTO race_results (
    id,
    completion_time,
    final_position,
    notes,
    penalty_time,
    recorded_at,
    starting_position,
    status,
    recorded_by_user_id,
    registration_id
) VALUES
(
    '60000000-0000-0000-0000-000000000001'::uuid,
    4120,
    1,
    'Fastest lantern route through the flooded corridor.',
    0,
    '2026-08-27 21:00:00'::timestamp,
    1,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000001'::uuid
),
(
    '60000000-0000-0000-0000-000000000002'::uuid,
    4275,
    2,
    'Minor detour through the mirror maze.',
    10,
    '2026-08-27 21:05:00'::timestamp,
    2,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000002'::uuid
),
(
    '60000000-0000-0000-0000-000000000003'::uuid,
    4400,
    3,
    'Kept a steady pace under the moonlight.',
    0,
    '2026-08-27 21:10:00'::timestamp,
    3,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000003'::uuid
),
(
    '60000000-0000-0000-0000-000000000004'::uuid,
    0,
    NULL::integer,
    'Did not finish after the clocktower descent.',
    0,
    '2026-08-27 21:15:00'::timestamp,
    4,
    'DID_NOT_FINISH',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000004'::uuid
),
(
    '60000000-0000-0000-0000-000000000005'::uuid,
    6900,
    1,
    'Clean relay handoffs through the ash storm.',
    0,
    '2026-08-30 21:00:00'::timestamp,
    1,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000005'::uuid
),
(
    '60000000-0000-0000-0000-000000000006'::uuid,
    7180,
    2,
    'Penalty assessed for a late second handoff.',
    15,
    '2026-08-30 21:05:00'::timestamp,
    2,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000006'::uuid
),
(
    '60000000-0000-0000-0000-000000000007'::uuid,
    0,
    NULL::integer,
    'Disqualified after leaving the relay boundary.',
    0,
    '2026-08-30 21:10:00'::timestamp,
    3,
    'DISQUALIFIED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000007'::uuid
),
(
    '60000000-0000-0000-0000-000000000008'::uuid,
    5800,
    1,
    'Temporary leader before the final circuit updates.',
    0,
    '2026-09-04 20:20:00'::timestamp,
    1,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000008'::uuid
),
(
    '60000000-0000-0000-0000-000000000009'::uuid,
    6050,
    2,
    'Strong team pace under the eclipse.',
    0,
    '2026-09-04 20:25:00'::timestamp,
    3,
    'FINISHED',
    (SELECT organizer_user_id FROM demo_context),
    '50000000-0000-0000-0000-000000000010'::uuid
);

COMMIT;

SELECT
    'audit_logs' AS table_name,
    COUNT(*) AS records
FROM audit_logs
UNION ALL
SELECT
    'competitors',
    COUNT(*)
FROM competitors
UNION ALL
SELECT
    'teams',
    COUNT(*)
FROM teams
UNION ALL
SELECT
    'team_members',
    COUNT(*)
FROM team_members
UNION ALL
SELECT
    'races',
    COUNT(*)
FROM races
UNION ALL
SELECT
    'race_registrations',
    COUNT(*)
FROM race_registrations
UNION ALL
SELECT
    'race_results',
    COUNT(*)
FROM race_results
ORDER BY table_name;

SELECT
    r.name AS race_name,
    r.race_type,
    r.status,
    COUNT(DISTINCT rr.id) AS registrations,
    COUNT(DISTINCT res.id) AS results
FROM races r
LEFT JOIN race_registrations rr
    ON rr.race_id = r.id
LEFT JOIN race_results res
    ON res.registration_id = rr.id
GROUP BY
    r.id,
    r.name,
    r.race_type,
    r.status,
    r.scheduled_at
ORDER BY r.scheduled_at;