FROM continuumio/miniconda3:23.5.2-0

COPY environment.yml /backend/
COPY ./ /backend/

WORKDIR /backend

RUN apt-get -y update
RUN apt-get install -y libsndfile1

RUN conda env create -f environment.yml
RUN echo "source activate test" >> ~/.bashrc
ENV PATH /opt/conda/envs/test/bin:$PATH

RUN mkdir /static

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


## NOT STABLE
# FROM python:3.10.4

# COPY . /backend/

# WORKDIR /backend

# RUN apt-get update && \
#     apt-get install -y libsndfile-dev && \
#     pip install --no-cache-dir -r requirements.txt

# RUN mkdir /static

# EXPOSE 8000
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
