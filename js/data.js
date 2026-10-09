/* =========================================================================
   CASE FILES
   - pos: world position [x, y, z] (metres). Bodies use feet position.
   - rot: yaw in degrees.
   - data: lab results as [label, value, highlight?]
   - lr: likelihood ratio per hypothesis. >1 supports it, <1 weakens it.
   ========================================================================= */
const CASES = [
    {
        id: 'penthouse', code: 'SS-2026-014', scene: 'penthouse', difficulty: 2,
        title: 'The Hale Penthouse', type: 'Homicide',
        location: 'Penthouse 41A, Meridian Tower', datetime: 'Fri 12 Sep 2026 · reported 23:40',
        summary: 'Art dealer Victor Hale, 52, was found shot in the study of his penthouse. A neighbour heard a single bang at 23:01. Three people had a reason and a way to be there.',
        victim: 'Victor Hale, 52 · art dealer',
        spawn: { pos: [0.2, 3.4], yaw: -25 },
        suspects: [
            { id: 'mara', name: 'Mara Hale', role: 'Spouse', age: 47, height: '1.62 m', motive: 'Sole beneficiary of a $4M life policy. Draft divorce papers were on his desk.', alibi: 'Says she was at her sister\'s apartment all evening.' },
            { id: 'dex', name: 'Dex Romano', role: 'Business partner', age: 49, height: '1.88 m', motive: 'Hale had evidence of forged provenance in their gallery sales.', alibi: 'Says he was home alone after 21:00.' },
            { id: 'ivan', name: 'Ivan Petrov', role: 'Night security', age: 38, height: '1.75 m', motive: 'Formally reprimanded by Hale for sleeping on shift.', alibi: 'Lobby desk, responded to the noise complaint.' },
            { id: 'self', name: 'Self-inflicted', role: 'Alternative hypothesis', age: '', height: '', motive: 'Victim carried $1.2M in gallery debts.', alibi: '' }
        ],
        evidence: [
            {
                id: 'V1', title: 'Victim · Victor Hale', kind: 'Body', obj: { type: 'body', pose: 'supine', outfit: 'suit' }, pos: [3.0, 0, -0.4], rot: -45, tent: [2.75, -0.1],
                found: 'Study floor, lying supine, feet toward the doorway',
                data: [['Cause of death', 'Single gunshot wound, left chest', 1], ['Entry wound', '9 mm · 1.28 m above heel · no soot or stippling', 1], ['Trajectory', 'Front to back · 4° downward · 12° left to right'], ['Body temp (00:30)', '35.1 °C · room 21 °C'], ['Est. time of death', '22:50 – 23:20', 1]],
                insight: 'No stippling means the muzzle was more than about a metre away. A distant, near-level shot from the front is inconsistent with suicide.',
                lr: { self: 0.2, mara: 1.1, dex: 1.1, ivan: 1.1 }
            },
            {
                id: 'E1', title: 'Pistol', kind: 'Firearm', obj: { type: 'pistol' }, pos: [3.05, 0, -1.6], rot: 30,
                found: 'Study floor, 0.4 m from the victim\'s right hand',
                data: [['Make / model', 'Walther PPQ · 9×19 mm'], ['Registered owner', 'Victor Hale (2019)'], ['Magazine', '14 of 15 rounds · one fired'], ['Latent prints', 'None. Grip and trigger wiped clean', 1], ['Origin', 'Kept in the locked desk drawer · drawer found open', 1]],
                insight: 'A wiped weapon is inconsistent with suicide. Whoever fired it knew where Hale kept it, which points to someone close to him.',
                lr: { mara: 1.9, dex: 1.2, ivan: 0.8, self: 0.4 }
            },
            {
                id: 'E2', title: 'Casing & Residue', kind: 'Ballistics', obj: { type: 'casing' }, pos: [1.85, 0, 0.95], rot: 0, tent: [2.1, 0.75],
                found: 'Study doorway floor; residue on the door frame',
                data: [['Casing', '9×19 mm · headstamp matches pistol ammunition'], ['Ejection', '0.9 m right-rear of firing position'], ['Gunshot residue', 'Dense deposit on door frame at 1.40–1.50 m', 1], ['Firing distance', '1.9 m to the victim\'s standing position', 1]],
                insight: 'The shot was fired from the doorway by a standing shooter, at about chest height.',
                lr: { self: 0.15, mara: 1, dex: 1.1, ivan: 1.1 }
            },
            {
                id: 'E3', title: 'Two Wine Glasses', kind: 'Trace', obj: { type: 'wineGlasses' }, pos: [2.3, 0.56, -3.2], rot: 0, tent: [2.75, -2.75],
                found: 'Side table by the study window',
                data: [['Wine', '1998 Barolo · ~60 ml left in each'], ['Glass A', 'Victor Hale\'s prints and saliva'], ['Glass B', 'Rim wiped · partial thumbprint on base (7 minutiae)', 1], ['Lipstick', 'None on either glass', 1]],
                insight: 'Hale was drinking with a familiar guest who later tried to wipe their glass. Mara wears lipstick daily per her statement.',
                lr: { mara: 0.8, dex: 1.3, ivan: 0.5, self: 0.6 }
            },
            {
                id: 'E4', title: 'Muddy Shoe Print', kind: 'Impression', obj: { type: 'print', shoe: 'dress' }, pos: [2.35, 0, 0.25], rot: 90, tent: [2.6, 0.55],
                found: 'Study floor, just inside the doorway',
                data: [['Size', 'Men\'s US 11 (EU 45)', 1], ['Outsole', 'Leather dress shoe · half-sole repair'], ['Contaminant', 'Wet clay and river silt', 1], ['Weather', 'Rain 22:00–23:00 · building lobby is dry'], ['Caveat', 'Print could pre-date the evening · cleaner last in 09:00']],
                insight: 'A man with large feet arrived from outside during the rain. Staff inside the building would have dry soles.',
                lr: { mara: 0.5, dex: 1.4, ivan: 0.8, self: 0.6 }
            },
            {
                id: 'E5', title: 'Shattered Phone', kind: 'Digital', obj: { type: 'shards', what: 'phone' }, pos: [4.7, 0, -1.9], rot: 0, frag: true,
                found: 'Study rug, 1.5 m from the body',
                data: [['Device', 'Victim\'s smartphone · 14 fragments', 1], ['Damage', 'Heel-stamp pattern · deliberate'], ['Storage chip', 'Intact under debris', 1], ['Last unlock', '22:49']],
                insight: 'Someone destroyed the phone after the shooting. The chip survived. Run AI reconstruction to reassemble it and recover the data.',
                lr: { self: 0.6 }
            },
            {
                id: 'E6', title: 'Elevator Access Log', kind: 'Records', obj: { type: 'panel', variant: 'elevator' }, pos: [4.95, 1.35, 4.98], rot: 180, tent: [4.95, 4.4],
                found: 'Private elevator panel, foyer',
                data: [['22:38', 'Ascent · guest code #4471 issued by V. Hale', 1], ['23:01', 'Noise complaint from 40A logged by concierge'], ['23:04', 'Descent · guest code #4471', 1], ['23:38', 'Ascent · security key I. Petrov'], ['Mara Hale key', 'Last used 18:15 (exit)', 1], ['Stairwell', 'Fire stairs to 41 · not alarmed, no camera']],
                insight: 'A guest invited by Hale arrived at 22:38 and left three minutes after the shot. Mara\'s key was not used, though the unmonitored fire stairs leave her a way in. Ivan only arrived afterwards.',
                lr: { mara: 0.7, dex: 1.3, ivan: 0.5, self: 0.7 }
            },
            {
                id: 'E7', title: 'Divorce Petition', kind: 'Document', obj: { type: 'papers' }, pos: [3.75, 0.765, -3.1], rot: 10, tent: [3.3, -2.45],
                found: 'Desk, beside the laptop',
                data: [['Document', 'Draft divorce petition, dated 10 Sep 2026'], ['Respondent', 'Mara Hale', 1], ['Prenuptial clause', 'Filing voids her life-policy beneficiary status', 1], ['Status', 'Unsigned · not yet filed']],
                insight: 'A strong motive for Mara: the policy would only pay her if Hale died before filing.',
                lr: { mara: 3.5, dex: 0.9, ivan: 1, self: 1.2 }
            }
        ],
        recon: {
            frag: 'E5', kind: 'trajectory', label: 'Ballistic trajectory & event projection',
            path: [[1.35, 1.45, 0.55], [3.0, 1.28, -0.4]],
            ghosts: [{ pos: [1.3, 0, 0.55], face: [3.0, -0.4], pose: 'aim', color: 0xff4d4d }, { pos: [3.0, 0, -0.4], face: [1.3, 0.55], pose: 'stand', color: 0x5aa9ff }],
            reveals: [
                {
                    id: 'A1', title: 'Recovered Messages', kind: 'AI · Digital', obj: { type: 'holo' }, pos: [4.7, 0, -1.9], tent: [4.35, -2.2],
                    found: 'Reassembled storage chip',
                    data: [['22:31 Hale → "D.R."', '"Bring the Kessler provenance file. Tonight."'], ['22:36 "D.R." → Hale', '"Coming up. We settle this tonight."', 1], ['22:44 Hale → Mara', '"Dex is here. Call you after."', 1]],
                    insight: 'Places Dex Romano in the penthouse within the time-of-death window, and explains the 22:38 guest code.',
                    lr: { dex: 3, mara: 0.5, ivan: 0.7, self: 0.4 }
                },
                {
                    id: 'A2', title: 'Shooter Projection', kind: 'AI · Ballistics', obj: { type: 'holo' }, pos: [1.25, 0, 0.1], tent: [1.0, 0.0],
                    found: 'Back-projected from wound angle and residue height',
                    data: [['Muzzle height', '1.45 ± 0.05 m', 1], ['Projected stature', '1.80 – 1.95 m', 1], ['Victim stance', 'Standing, facing the doorway'], ['Suspect heights', 'Mara 1.62 · Dex 1.88 · Ivan 1.75']],
                    insight: 'The shooter was tall. Dex (1.88 m) fits; Mara (1.62 m) would have had to hold the gun above her head.',
                    lr: { dex: 1.9, mara: 0.25, ivan: 0.8, self: 0.1 }
                }
            ]
        },
        solution: 'dex',
        explain: 'Dex Romano came up at 22:38 on Hale\'s guest code to confront him about the forged provenance. After a glass of wine the argument escalated. Dex took Hale\'s pistol from the open desk drawer, shot him from the doorway at 23:01, wiped the gun and the glass, stamped on the phone and left at 23:04.',
        timeline: [['22:36', 'Dex: "Coming up. We settle this tonight."'], ['22:38', 'Elevator ascent on Hale\'s guest code'], ['22:44', 'Hale texts Mara: "Dex is here."'], ['23:01', 'Single shot from the study doorway'], ['23:04', 'Elevator descent on the guest code'], ['23:38', 'Security arrives; body found 23:40']]
    },
    {
        id: 'lake', code: 'SS-2026-022', scene: 'lake', difficulty: 3,
        title: 'Death at Silver Lake', type: 'Suspicious death',
        location: 'Quinn family cabin, Silver Lake, Pine County', datetime: 'Sat 4 Oct 2026 · body recovered 06:10',
        summary: 'Developer Nora Quinn, 38, was pulled from Silver Lake beside her family\'s dock at dawn. First responders logged it as an accidental drowning after a night of drinking. The coroner is not convinced.',
        victim: 'Nora Quinn, 38 · real-estate developer',
        spawn: { pos: [3, 8], yaw: 10 },
        suspects: [
            { id: 'ethan', name: 'Ethan Quinn', role: 'Husband', age: 41, height: '1.80 m · shoe US 10', motive: 'Inherits the lakefront land. Couple were in separation talks.', alibi: 'Asleep in the cabin from 22:41.' },
            { id: 'cole', name: 'Cole Varga', role: 'Neighbour', age: 55, height: '1.91 m · shoe US 12', motive: 'Fought Nora\'s plan to develop the shoreline. Public shouting match last week.', alibi: 'Says he was asleep by 22:00.' },
            { id: 'lena', name: 'Lena Brooks', role: 'Business partner', age: 36, height: '1.68 m · shoe W 7', motive: 'Nora was forcing a buy-out of her share at a heavy loss.', alibi: 'Says she drove home to the city at 21:30.' },
            { id: 'accident', name: 'Accidental drowning', role: 'Alternative hypothesis', age: '', height: '', motive: 'Victim had been drinking on the dock.', alibi: '' }
        ],
        evidence: [
            {
                id: 'V1', title: 'Victim · Nora Quinn', kind: 'Body', obj: { type: 'body', pose: 'supine', outfit: 'outdoor' }, pos: [3.6, 0, -0.2], rot: 80, tent: [3.0, 0.5],
                found: 'Shoreline beside the dock, after recovery from the water',
                data: [['Cause of death', 'Drowning · froth in airways, water in sinuses', 1], ['Head injury', '4 cm depressed fracture, left parietal · before death', 1], ['Wound trace', 'Pine splinters with green paint', 1], ['Blood alcohol', '0.04 % (light)'], ['Est. time of death', '23:30 – 01:30']],
                insight: 'She was struck on the head before entering the water and drowned while unconscious. Light drinking alone does not explain it. Look for a green-painted wooden object.',
                lr: { accident: 0.15, ethan: 1.1, cole: 1.2, lena: 1.1 }
            },
            {
                id: 'E1', title: 'Green Oar', kind: 'Weapon?', obj: { type: 'oar' }, pos: [11.4, 0, -0.15], rot: 70, tent: [11.0, 0.5],
                found: 'Reeds, 8 m east of the dock',
                data: [['Object', 'Pine oar, green paint · blade cracked', 1], ['Blood', 'Human, O+ · matches victim', 1], ['Prints', 'Smeared palm print, unusable'], ['Match', 'Fits the oarlock of rowboat SL-2231']],
                insight: 'This is the likely weapon, and the paint matches the splinters in the wound. The oar belongs to the rowboat on the shore.',
                lr: { cole: 1.2, ethan: 1.2, lena: 0.8, accident: 0.3 }
            },
            {
                id: 'E2', title: 'Beached Rowboat', kind: 'Vessel', obj: { type: 'rowboat' }, pos: [8.6, 0, -1.4], rot: 115, tent: [8.0, 0.4],
                found: 'Bow-first on the Quinn shoreline, untied',
                data: [['Registration', 'SL-2231 · Cole Varga', 1], ['Mooring', 'Normally kept at the Varga launch, 300 m north-east'], ['Rainwater in hull', '3 cm · rain stopped 21:00 · used after the rain', 1], ['Oars', 'One missing (see oar)'], ['Neighbours', 'Ethan has borrowed this boat before', 1]],
                insight: 'Varga\'s boat was taken out after 21:00 and drifted or was rowed here. It was kept unlocked, so others could have used it.',
                lr: { cole: 1.2, ethan: 1.3, lena: 0.8, accident: 0.6 }
            },
            {
                id: 'E3', title: 'Whiskey & Glasses', kind: 'Trace', obj: { type: 'whiskey' }, pos: [0.5, 0.5, -11.6], rot: 0, tent: [-0.4, -11.0],
                found: 'Bench at the end of the dock',
                data: [['Bottle', 'Bourbon · one third consumed'], ['Glass 1', 'Nora\'s prints and lipstick'], ['Glass 2', 'Ethan\'s prints', 1], ['Statement', 'Ethan: "We had a drink, I went in at 22:40."']],
                insight: 'Ethan was on the dock with Nora that evening, as he says. Drinking makes an accidental fall more plausible.',
                lr: { ethan: 1.8, cole: 0.9, lena: 0.9, accident: 1.5 }
            },
            {
                id: 'E4', title: 'Doorbell Camera', kind: 'Video', obj: { type: 'doorcam' }, pos: [-8.6, 1.45, 4.32], rot: 180, tent: [-8.6, 2.6],
                found: 'Cabin front door',
                data: [['22:41', 'Ethan enters the cabin', 1], ['23:52', 'Nora leaves with a flashlight, heading east', 1], ['05:58', 'Ethan exits and calls 911'], ['Rear door', 'Alarmed · not opened all night'], ['Bedroom window', 'Found unlatched at 06:30', 1]],
                insight: 'Ethan did not use a door between 22:41 and 05:58, but an unlatched window leaves room for doubt. Nora walked out alone, towards the east shore.',
                lr: { ethan: 0.5, cole: 1.2, lena: 1.1, accident: 1 }
            },
            {
                id: 'E5', title: 'Boot Prints', kind: 'Impression', obj: { type: 'printTrail', shoe: 'boot', to: [15.5, 4.0] }, pos: [12.6, 0, 0.6], rot: 0,
                found: 'Mud between the east path and the shore',
                data: [['Size', 'Men\'s US 11–12 (partly washed out) · lug sole', 1], ['Depth', 'Wearer about 85–100 kg'], ['Trail', 'From the path to the Varga property, to the shore and back', 1], ['Age', 'Made after the rain stopped']],
                insight: 'A heavy man with large feet walked between the Varga property and this shoreline overnight. The washed-out edges make the size uncertain.',
                lr: { cole: 1.4, ethan: 0.7, lena: 0.4, accident: 0.5 }
            },
            {
                id: 'E6', title: 'Waterlogged Phone', kind: 'Digital', obj: { type: 'shards', what: 'phone' }, pos: [-1.4, 0, -1.0], rot: 0, frag: true,
                found: 'Waterline, 2 m west of the dock',
                data: [['Device', 'Nora\'s phone · screen shattered, waterlogged', 1], ['Fragments', '11 recovered'], ['Storage', 'Corroded, partially readable', 1]],
                insight: 'Damage hides the call log. Run AI reconstruction to reassemble the device and recover the final calls.',
                lr: {}
            },
            {
                id: 'E7', title: 'Nora\'s Car', kind: 'Vehicle', obj: { model: 'CarConcept', scale: 0.82 }, pos: [-3.5, 0, 9.2], rot: 160, tent: [-1.4, 8.4],
                found: 'Gravel drive beside the cabin',
                data: [['Passenger seat', 'Buy-out offer to Lena Brooks, $1.1M below valuation', 1], ['Note on offer', 'Handwritten by Lena: "You\'ll regret this."', 1], ['Engine', 'Cold at 06:20 · not driven overnight']],
                insight: 'A strong motive for Lena. Nothing yet places her at the lake that night.',
                lr: { lena: 3.0, cole: 0.9, ethan: 1, accident: 0.9 }
            }
        ],
        recon: {
            frag: 'E6', kind: 'drift', label: 'Lake current drift back-projection',
            path: [[17.2, 0.02, -3.0], [14, 0.02, -7], [8, 0.02, -8.5], [3.5, 0.02, -5], [2.6, 0.02, -1.6]],
            ghosts: [{ pos: [16.6, 0, -0.3], face: [17.3, -1.0], pose: 'swing', color: 0xff4d4d }, { pos: [17.3, 0, -1.0], face: [16.6, -0.3], pose: 'stand', color: 0x5aa9ff }],
            reveals: [
                {
                    id: 'A1', title: 'Recovered Call Log', kind: 'AI · Digital', obj: { type: 'holo' }, pos: [-1.4, 0, -1.0], tent: [-2.0, -0.5],
                    found: 'Reassembled storage',
                    data: [['23:49', 'Incoming · Lena B. · 1 min'], ['23:53', 'Outgoing · Cole Varga · 2 min 14 s', 1], ['00:07', 'Message to Cole: "I\'m at your launch. Let\'s end this."', 1]],
                    insight: 'Nora arranged to meet Cole at his boat launch minutes after leaving the cabin.',
                    lr: { cole: 2.4, lena: 1.2, ethan: 0.8, accident: 0.5 }
                },
                {
                    id: 'A2', title: 'Drift Projection', kind: 'AI · Hydrology', obj: { type: 'holo' }, pos: [16.0, 0, -0.6], tent: [15.4, 0.0],
                    found: 'Back-projected from recovery point using buoy SL-3 current data',
                    data: [['Current', '0.06 m/s north-west · buoy SL-3'], ['Drift time', 'About 5.5 h'], ['Projected entry point', 'Varga boat launch · ±40 m', 1], ['Rowboat', 'Same drift path explains its position', 1]],
                    insight: 'Nora went into the water at the Varga launch, not at her own dock. The current carried her and the boat here.',
                    lr: { cole: 2.0, ethan: 0.6, lena: 0.8, accident: 0.5 }
                }
            ]
        },
        solution: 'cole',
        explain: 'Nora called Cole at 23:53 and met him at his boat launch to settle the shoreline dispute. The argument turned violent and Cole struck her with the green oar. She fell into the lake unconscious and drowned. In a panic he pushed the boat off; the current carried Nora, the boat and the oar to the Quinn shore by dawn.',
        timeline: [['22:41', 'Ethan goes into the cabin (doorbell camera)'], ['23:49', 'Lena calls Nora for one minute'], ['23:52', 'Nora leaves the cabin with a flashlight'], ['23:53', 'Nora calls Cole for 2 min 14 s'], ['00:07', '"I\'m at your launch."'], ['~00:15', 'Struck with the oar at the Varga launch'], ['06:10', 'Body recovered beside the Quinn dock']]
    },
    {
        id: 'museum', code: 'SS-2026-031', scene: 'museum', difficulty: 2,
        title: 'The Meridian Diamond', type: 'Burglary',
        location: 'Hall of Gems, Ashford Museum of Natural History', datetime: 'Wed 22 Oct 2026 · 01:00 – 01:30',
        summary: 'The 40-carat Meridian Diamond vanished from its case in the Hall of Gems overnight. No exterior door was forced and the alarm never sounded.',
        victim: 'Ashford Museum · Meridian Diamond, insured $18M',
        spawn: { pos: [0, 5.6], yaw: 0 },
        suspects: [
            { id: 'elena', name: 'Dr. Elena Ruiz', role: 'Curator', age: 44, height: '1.65 m · shoe W 7', motive: 'Passed over for director. Private debts of $300K.', alibi: 'Working late in her office on the amber catalogue.' },
            { id: 'sam', name: 'Sam Okafor', role: 'Night guard', age: 31, height: '1.83 m · shoe US 11', motive: 'Approached by a known fence last year (he reported it).', alibi: 'On patrol; answered a fault alarm in the east wing.' },
            { id: 'leo', name: 'Leo Marsh', role: 'HVAC contractor', age: 46, height: '1.78 m · shoe US 10', motive: 'Serviced the gallery ducts last month. Prior burglary arrest (2011).', alibi: 'Says he was at home.' },
            { id: 'crew', name: 'Outside crew', role: 'Unknown professionals', age: '', height: '', motive: 'Two similar museum heists this year in other cities.', alibi: '' }
        ],
        evidence: [
            {
                id: 'E1', title: 'Alarm Panel Log', kind: 'Records', obj: { type: 'panel', variant: 'alarm' }, pos: [-7.92, 1.45, 4.6], rot: 90, tent: [-7.2, 4.6],
                found: 'Security panel by the hall entrance',
                data: [['01:12:07', 'Zone 3 (Hall of Gems) set to MAINTENANCE', 1], ['Code used', '#7 · Facilities & Curatorial', 1], ['01:31:40', 'Zone 3 re-armed with code #7'], ['Code holders', 'Dr. E. Ruiz · L. Marsh (temp code never revoked)', 1]],
                insight: 'Whoever disarmed the hall had code #7. Only the curator and the HVAC contractor held it.',
                lr: { elena: 1.7, leo: 1.4, sam: 0.7, crew: 0.5 }
            },
            {
                id: 'E2', title: 'Fallen Vent Grille', kind: 'Entry point', obj: { type: 'grille' }, pos: [-4.9, 0, -4.8], rot: 20, tent: [-4.2, -4.7],
                found: 'Floor below the open ceiling duct',
                data: [['Grille', '60 × 60 cm · 4 screws removed, not forced', 1], ['Tool marks', '4 mm hex bit'], ['Duct', '50 cm clearance · runs to the roof plant room', 1], ['Dust', 'Disturbed along 22 m of duct']],
                insight: 'Entry was through the ductwork, unscrewed with the right tool. That needs knowledge of the HVAC layout.',
                lr: { leo: 1.5, crew: 1.6, elena: 0.7, sam: 0.7 }
            },
            {
                id: 'E3', title: 'Boot Prints', kind: 'Impression', obj: { type: 'printTrail', shoe: 'work', to: [-1.0, -1.6] }, pos: [-4.3, 0, -4.1], rot: 0,
                found: 'Marble floor between the vent and the pedestal',
                data: [['Size', 'Men\'s US 10–11 · industrial lug', 1], ['Contaminant', 'Fibreglass insulation and duct-sealant dust', 1], ['Weight estimate', '75–85 kg'], ['Direction', 'Vent → pedestal → vent']],
                insight: 'The thief came down from the duct and went back the same way. The size fits Leo or Sam; Elena wears women\'s 7.',
                lr: { leo: 1.4, crew: 1.3, sam: 0.7, elena: 0.4 }
            },
            {
                id: 'E4', title: 'Guard Logbook', kind: 'Records', obj: { type: 'logbook' }, pos: [5.55, 0.78, 5.45], rot: -90, tent: [4.6, 5.0],
                found: 'Security desk',
                data: [['Rounds', 'Logged hourly, on time'], ['Gap', '01:10 – 01:25', 1], ['Reason given', '"Fault alarm, east wing. False."', 1], ['East wing fault', 'Sensor E-14 tampered · needs panel access']],
                insight: 'Sam was away exactly during the theft. The fault that drew him away was deliberately triggered.',
                lr: { sam: 1.8, leo: 1.1, elena: 1.1, crew: 1 }
            },
            {
                id: 'E5', title: 'Shattered Case Glass', kind: 'Physical', obj: { type: 'shards', what: 'glass' }, pos: [0, 0, -0.3], rot: 0, frag: true, tent: [0.9, 0.5],
                found: 'Around the central pedestal',
                data: [['Glass', '10 mm laminated · 62 fragments', 1], ['Edge marks', 'Circular score on three fragments'], ['Cushion', 'Empty · dust outline intact']],
                insight: 'The pattern is unreadable while it is scattered. Run AI reconstruction to reassemble the pane.',
                lr: { crew: 1.2 }
            },
            {
                id: 'E6', title: 'Badge Printout', kind: 'Records', obj: { type: 'lectern' }, pos: [4.4, 0, -3.4], rot: -120, tent: [3.7, -2.9],
                found: 'Lectern beside the amber exhibit',
                data: [['00:47', 'Dr. E. Ruiz badges in, staff entrance', 1], ['01:58', 'Dr. E. Ruiz badges out'], ['Office camera', 'Ruiz at her desk 00:55–01:50 · footage corrupted 01:05–01:20', 1]],
                insight: 'Elena was in the building, and her alibi has a 15-minute hole that overlaps the theft.',
                lr: { elena: 2.4, leo: 0.9, sam: 1, crew: 0.9 }
            }
        ],
        recon: {
            frag: 'E5', kind: 'route', label: 'Fracture analysis & intruder route projection',
            path: [[-5.0, 5.4, -5.4], [-4.9, 0.08, -4.8], [-2.8, 0.08, -3.0], [-0.7, 0.08, -0.9], [-2.4, 0.08, -2.3], [-4.6, 0.08, -4.5], [-5.0, 5.4, -5.4]],
            ghosts: [{ pos: [-0.8, 0, -1.0], face: [0, -0.5], pose: 'reach', color: 0xff4d4d }],
            cone: { from: [7.4, 4.6, 6.4], to: [0.5, 0, -0.5], angle: 26 },
            reveals: [
                {
                    id: 'A1', title: 'Reassembled Pane', kind: 'AI · Physical', obj: { type: 'holo' }, pos: [0.9, 0, -1.2], tent: [1.3, -1.6],
                    found: 'Virtual reassembly of 62 fragments',
                    data: [['Score mark', 'Ø 18 cm · tungsten cutter', 1], ['Edge residue', 'Grey butyl duct sealant (the brand used by Marsh HVAC)', 1], ['Fracture origin', 'Struck from outside after scoring']],
                    insight: 'The cutter carried duct sealant. Whoever cut the case had just been working inside the ductwork.',
                    lr: { leo: 2.6, crew: 0.8, elena: 0.5, sam: 0.5 }
                },
                {
                    id: 'A2', title: 'Route Projection', kind: 'AI · Spatial', obj: { type: 'holo' }, pos: [-2.6, 0, -1.6], tent: [-2.2, -1.0],
                    found: 'Print sequence and camera coverage model',
                    data: [['Route', 'Vent → case → vent · 38 m'], ['Duration', 'About 4 minutes on foot'], ['Camera CAM-3', 'Route stays inside its blind spot', 1], ['Requires', 'Duct layout and camera map, both in the HVAC service file', 1]],
                    insight: 'The route was planned with the HVAC service documents, which the contractor had.',
                    lr: { leo: 1.8, elena: 1.2, crew: 0.6, sam: 0.8 }
                }
            ]
        },
        solution: 'leo',
        explain: 'Leo Marsh kept the maintenance code from his service contract. At 01:10 he tampered with east-wing sensor E-14 to draw the guard away. He set the hall to maintenance at 01:12, dropped from the duct he had serviced, cut the case and left the same way. Sealant from his own repair work gave him away.',
        timeline: [['00:47', 'Curator badges in (red herring)'], ['01:10', 'Sensor E-14 tampered · guard leaves'], ['01:12', 'Zone 3 set to maintenance with code #7'], ['01:14', 'Grille removed · entry from the duct'], ['01:18', 'Case scored and broken'], ['01:31', 'Zone 3 re-armed · exit through the duct']]
    }
];
