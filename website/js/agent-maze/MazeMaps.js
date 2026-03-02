import { WALL, EMPTY, REWARD, UP, RIGHT } from "./Globals.js";
/** Array of maze topologies */
export const mazeMaps = [
    {
        rows: [
            [EMPTY, EMPTY, EMPTY, EMPTY, REWARD],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL]
        ],
        startX: 2,
        startY: 4,
        startD: UP,
        name: "T maze with reward",
        id: String(1),
        symbol: "triangle-down",
    },
    {
        rows: [
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL],
            [WALL, WALL, EMPTY, WALL, WALL]
        ],
        startX: 2,
        startY: 4,
        startD: UP,
        name: "Straight line maze",
        id: String(2),
        symbol: "triangle-up"
    },
    {
        rows: [
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, WALL, EMPTY, WALL, EMPTY],
            [EMPTY, WALL, REWARD, WALL, EMPTY],
            [EMPTY, WALL, WALL, WALL, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
        ],
        startX: 2,
        startY: 4,
        startD: UP,
        name: "U maze with reward",
        id: String(3),
        symbol: "star"
    },
    {
        rows: [
            [WALL, WALL, WALL, WALL, WALL],
            [WALL, EMPTY, EMPTY, EMPTY, WALL],
            [WALL, EMPTY, EMPTY, EMPTY, WALL],
            [WALL, EMPTY, EMPTY, EMPTY, WALL],
            [WALL, WALL, WALL, WALL, WALL]
        ],
        startX: 2,
        startY: 2,
        startD: UP,
        name: "Square room",
        id: String(4),
        symbol: "square"
    },
    {
        rows: [
            [EMPTY, EMPTY, EMPTY, EMPTY, REWARD],
            [EMPTY, WALL, WALL, WALL, WALL],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [WALL, WALL, WALL, WALL, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
        ],
        startX: 0,
        startY: 4,
        startD: RIGHT,
        name: "S maze with reward",
        id: String(5),
        symbol: "diamond"
    },
    {
        rows: [
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, WALL, REWARD, WALL, EMPTY],
            [EMPTY, EMPTY, WALL, EMPTY, EMPTY],
            [EMPTY, WALL, EMPTY, WALL, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
        ],
        startX: 2,
        startY: 4,
        startD: UP,
        name: "X maze with reward",
        id: String(6),
        symbol: "x"
    }
];
