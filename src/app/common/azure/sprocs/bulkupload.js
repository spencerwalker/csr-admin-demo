//This sproc is stored on Azure DocumentDB within each collection
//This is simply a way to reference the sproc in case it is lost

function bulkupload(body) {
    //Get the current context and collection the sproc is in
    var context = getContext();
    var collection = context.getCollection();
    var collectionLink = collection.getSelfLink();

    var result = {Successful: 0, Failed: 0};

    //Serves as the current doc index
    var index = 0;

    var docsLength = body.documents.length;
    if (docsLength == 0) {
        context.getResponse().setBody(index);
    }

    createDocument(body.documents[index]);

    function createDocument(doc) {
        collection.createDocument(collectionLink, doc, function(err, created) {
            if (err) {
                result.Failed++;
            }
            else {
                result.Successful++;
            }

            //Increment index to the next document
            index++;

            if (index < docsLength) {
                //Create next document
                createDocument(body.documents[index]);
            }
            else {
                //No more documents. Send the result.
                context.getResponse().setBody(result);
            }
        });
    }
}