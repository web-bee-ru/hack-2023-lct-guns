# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/engine/reference/builder/


# @REFERENCE: https://fastapi.tiangolo.com/deployment/docker/#docker-image-with-poetry
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime as requirements

WORKDIR /app

RUN pip install poetry
RUN poetry self add poetry-plugin-export

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=poetry.lock,target=poetry.lock \
    poetry export -f requirements.txt --output requirements.txt --without-hashes

FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime as base

RUN apt-get update
RUN apt-get install -y libgl1-mesa-dev libglib2.0-0

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Create a non-privileged user that the app will run under.
# See https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

COPY --from=requirements /app/requirements.txt /app/requirements.txt

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.cache/pip to speed up subsequent builds.
# Leverage a bind mount to requirements.txt to avoid having to copy them into
# into this layer.
RUN pip install poetry
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy the source code into the container.
COPY . .

# Switch to the non-privileged user to run the application.
USER appuser

# Expose the port that the application listens on.
EXPOSE 8000

# Run the application.
CMD uvicorn 'src.main:app' --host=0.0.0.0 --port=8000
