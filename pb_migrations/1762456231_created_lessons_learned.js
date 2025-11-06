/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ef3y9mck7dpdq2e",
    "created": "2025-11-06 19:10:31.241Z",
    "updated": "2025-11-06 19:10:31.241Z",
    "name": "lessons_learned",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "vnxkmfqj",
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
        "id": "ssmfjbmd",
        "name": "lesson_text",
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
  const collection = dao.findCollectionByNameOrId("ef3y9mck7dpdq2e");

  return dao.deleteCollection(collection);
})
