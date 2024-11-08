# Listening Lab - Annotator
The listening lab is an open-source platform for audio annotation of less vocal and typically more challenging species. 

This tool allows you to:
- Upload raw field recordings
- Automatic segment sparse features of interest to reduce processing time
- Train state-of-the-art transformer-based model for your application
- Export annotations and models for use in the field
- Outlier detection

This tool was developed by the University of Canterbury's Listening Lab Bioacoustic Research group <https://github.com/listening-lab> 

**Data available here** [Invasive Species dataset](https://kaggle.com/datasets/0f51f43c1b9340d2180656990e32532a3e87afc8520f153111b6ba39ebcad073)

![Screenshot of Annotation tool](/frontend/src/utils/fieldrecording.png)

## Setup
Start frontend using `cd frontend` then `npm start` after installing dependences

Start backend server using `cd backend` then `uvicorn main:app --reload`

Python dependences in `./backend/environment.yml`

### Docker
To start a clean build on your local machine run `docker-compose up -d` after cloning the repository. 

#### Docker Hub
Install the latest images using docker hub `docker image pull -a benmcewen/listening-lab`

Start the frontend using `docker run -p 3000:3000 benmcewen/listening-lab:frontend` and the backend using `docker run -p 8000:8000 benmcewen/listening-lab:backend`

### Classification Pipeline
We current use a transformer-based classification model - Audio Spectrogram Transformer (AST). The implementation can be found in `./backend/preprocessing/classifier.py`. 

![Annoation pipeline](/frontend/src/utils/pipeline.png)

## Citation
If you find this tool useful, please cite it
```
@article{mcewen2024active,
  title={Active few-shot learning for rare bioacoustic feature annotation},
  author={McEwen, Ben and Soltero, Kaspar and Gutschmidt, Stefanie and Bainbridge-Smith, Andrew and Atlas, James and Green, Richard},
  journal={Ecological Informatics},
  volume={82},
  pages={102734},
  year={2024},
  publisher={Elsevier}
}
```

## Contribute
Feel free to contribute to this project or adapt it for your application. 


### Bug fixes
- Prototype removed when label removed and unknown prototype not included at inference
