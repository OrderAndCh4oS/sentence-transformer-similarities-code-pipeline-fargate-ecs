FROM public.ecr.aws/amazonlinux/amazonlinux:2022
RUN yum install python3 && \
curl -O https://bootstrap.pypa.io/get-pip.py && \
python3 get-pip.py
ENV PLATFORM 'Amazon ECS'
WORKDIR /src
RUN python3 -m pip install --upgrade pip
COPY ./requirements.txt /src/requirements.txt
RUN pip install torch --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --upgrade -r /src/requirements.txt
COPY ./app /src/app
RUN mkdir ./app/models
RUN chmod +x ./app/save_sentence_transformer_model.py
RUN python3 ./app/save_sentence_transformer_model.py
# Todo: save model with python script
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
