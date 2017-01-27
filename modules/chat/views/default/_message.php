<li data-id = "<?= $message->getId() ?>"
    data-creation-date = "<?= $message->getCreationDate() ?>"
    data-new="<?= $message->isNew()?>">
    <div class="message  <?php echo $message->isAuthor(\Yii::$app->user->getId()) ?  "message-to" : "message-from"; ?>">
        <p><?= $message->getContent() ?></p>
        <h6><i><?= \Yii::$app->formatter->asDate($message->getCreationDate(), "php:d F, G : i") ?></i></h6>
    </div>
</li>

