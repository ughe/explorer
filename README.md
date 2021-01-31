# Explorer

Generic data explorer, designed for viewing hundreds of thousands of images, pre-computed metrics, and multiple OCR transcriptions all on a single dashboard. Adapted from the [Old Bailey and OCR explorer](https://obo.cs.princeton.edu), which is associated with https://github.com/ughe/old-bailey.

## Data

The `data/` directory contains the following structure:

```
├── config.csv
├── imgs
│   └── .gitkeep
├── txts
│   └── .gitkeep
└── results.csv
```

The `data/` directory is essentially an empty scaffolding in this repo, since it can be interchanged to swap the contents of the viewer. For example, see https://obo.cs.princeton.edu/mini/data for a deployment of this repo with a specialized data dir. The `config.csv` and `results.csv` must be set up correctly, along with the actual images in `imgs` and the different text transcriptions in subfolders within `txts`.

`config.csv` contains the site title, image extension, list of directories in `data/txts/`, and optionally: navbar links & metric min/max ranges. Here is an example `config.csv`:

```
title,Sample Title
imgs-fmt,jpg
txts-dirs,FirstDirName;SecondDirName;EtcDirName
[]links,Button1;https://google.com
[]links,Button2;data/
[]range,ExampleMetricSubstring;Min;Max
[]range,Time;0;12000
```

Note that the semicolon-separated list of `txts-dirs` are expected to be dir names inside `data/txts/` and each dir should contain every single image pointer with `.txt` on the end.

`results.csv` contains a row of image pointers (image names without file extension) and then a row for each pre-computed metric. For example:

```
ptr,Image1,Image2, ...
Time (Millis),300,400, ...
```

## Get Started

Initialize the `data/` directory and then serve from the explorer's top-level dir:

```
python3 -m http.server
```

```
open http://127.0.0.1:8000
```
