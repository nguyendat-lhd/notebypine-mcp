/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "uz2oiq21mq5tcuq",
    "created": "2025-11-06 19:09:43.703Z",
    "updated": "2025-11-06 19:09:43.703Z",
    "name": "incidents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "yxgnxlb0",
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("uz2oiq21mq5tcuq");

  return dao.deleteCollection(collection);
})
