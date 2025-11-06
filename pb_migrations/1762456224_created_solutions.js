/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "tzksd3s8sobpakp",
    "created": "2025-11-06 19:10:24.325Z",
    "updated": "2025-11-06 19:10:24.325Z",
    "name": "solutions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "nryqebzq",
        "name": "incident_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "mshzqhfs",
        "name": "solution_title",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "18vqtj6h",
        "name": "solution_description",
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
  const collection = dao.findCollectionByNameOrId("tzksd3s8sobpakp");

  return dao.deleteCollection(collection);
})
