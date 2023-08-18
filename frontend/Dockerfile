FROM node

COPY ./package*.json /frontend/
COPY ./ /frontend/
WORKDIR /frontend

RUN npm install

EXPOSE 3000
CMD ["npm", "start"]