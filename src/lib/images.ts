export type ImageData = {
  id: number;
  name: string;
  description: string;
  src: string;
};

export const IMG_LIST: ImageData[] = [
  {
    id: 1,
    name: "Facade for a Church with a Sculpture Representing Faith",
    description: "French, 1739 - 1794",
    src: "/images/1.jpg",
  },
  {
    id: 2,
    name: "René de Gas by Edgar Degas",
    description: "French, 1834 - 1917",
    src: "/images/2.jpg",
  },
  {
    id: 3,
    name: "Park by Paul Klee",
    description: "Swiss, 1879 - 1940",
    src: "/images/3.jpg",
  },
  {
    id: 4,
    name: "Flowers in a Rococo Vase",
    description: "French, 1839 - 1906",
    src: "/images/4.jpg",
  },
  {
    id: 5,
    name: "Antony Valabrègue",
    description: "French, 1839 - 1906",
    src: "/images/5.jpg",
  },
  {
    id: 6,
    name: "The Gardener Vallier",
    description: "French, 1839 - 1906",
    src: "/images/6.jpg",
  },
  {
    id: 7,
    name: "Boudoir by Perkins Harnly",
    description: "American, 1901 - 1986",
    src: "/images/7.jpg",
  },
  {
    id: 8,
    name: "Flowers in a Crystal Vase",
    description: "French, 1832 - 1883",
    src: "/images/8.jpg",
  },
  {
    id: 9,
    name: "A King Charles Spaniel",
    description: "French, 1832 - 1883",
    src: "/images/9.jpg",
  },
  {
    id: 10,
    name: "Jerusalem Artichoke Flowers",
    description: "French, 1840 - 1926",
    src: "/images/10.jpg",
  },
];

export const getImageById = (id: number): ImageData => {
  return IMG_LIST.find((img) => img.id === id) ?? IMG_LIST[0];
};

export const getRandomImageId = (): number => {
  return IMG_LIST[Math.floor(Math.random() * IMG_LIST.length)].id;
};
