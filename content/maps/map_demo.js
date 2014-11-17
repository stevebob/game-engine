function MapDemo() {
    this.regions({
        r1: [
            [[100, 100], [100, 300]],
            [[100, 300], [400, 300]],
            [[550, 300], [600, 300]],
            [[600, 300], [600, 260]],
            [[600, 140], [600, 100]],
            [[600, 100], [100, 100]]
        ],
        r2: [
            [[400, 300], [400, 350]],
            [[400, 350], [350, 400]],
            [[350, 400], [300, 350]],
            [[550, 300], [550, 350]],
            [[550, 350], [350, 550]],
            [[350, 550], [150, 350]],
            
        ],
        r3: [
            [[150, 350], [150, 50]],
            [[300, 350], [300, 250]],
            [[150, 50], [500, 50]],
            [[500, 50], [500, 250]],
            [[500, 250], [300, 250]]
        ],
        r4: [
            [[600, 140], [610, 140]],
            [[610, 140], [610, 50]],
            [[610, 50], [1200, 50]],
            [[1200, 50], [1200, 400]],
            [[1200, 400], [1610, 400]],
            [[1610, 400], [1610, 600]],
            [[1610, 600], [810, 600]],
            [[690, 600], [610, 600]],
            [[610, 600], [610, 260]],
            [[610, 260], [600, 260]]
        ],
        r5: [
            [[690, 600], [690, 750]],
            [[810, 600], [810, 750]]
        ],
        r6: [
            [[690, 750], [400, 750]],
            [[400, 750], [400, 1000]],
            [[400, 1000], [1000, 1000]],
            [[1000, 1000], [1000, 750]],
            [[1000, 750], [810, 750]]
        ]
    });

    this.connect(
        ['r1', 'r2', [[400, 300], [550, 300]]],
        ['r3', 'r2', [[150, 350], [300, 350]]],
        ['r1', 'r4', [[600, 250], [600, 150]]],
        ['r4', 'r5', [[700, 600], [800, 600]]],
        ['r5', 'r6', [[700, 750], [800, 750]]]
    );

    this.levels({
        level1: [['r1', 'r2', 'r4', 'r5', 'r6'], [
            [[300, 350], [150, 350]]
        ]],
        level2: [['r2', 'r3'], [
            [[400, 350], [550, 350]]
        ]]
    });
    
    this.lights({
        l1: ['level1', [1000, 100], 800, [1,1,1,1]],
        l2: ['level1', [1500, 500], 1500, [1,0.9,0.5,1]],
        l3: ['level2', [400, 110], 500, [1,0.5,0.5,1]]
    });

    this.level_detectors({
        r2: ['level1', 'level2', [[350, 400], [350, 550]]]
    });

    this.initial('level1');
}
