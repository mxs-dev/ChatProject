<?php
/* @var $dialog app\modules\chat\models\Dialog; */
?>
<div class="col-md-8 col-sm-10 col-md-offset-2 col-sm-offset-1">
    <div>
        <div class="col-md-1 col-sm-1">
            <a class="btn-sm btn-primary" href="<?=\yii\helpers\Url::to(['/chat/default']) ?>">Back</a>
        </div>
        <div class="col-md-3 col-sm-3 col-sm-offset-1 ">
            <span class="text-left">#<?= $dialog->getId() . " | " . $dialog->getTitle()?></span>
        </div>
        <div class="col-md-6 col-sm-6">
            <p class="text-success text-center" style="font-weight:700; text-align: center;">
             <?php
                foreach ($dialog->getUsers(true) as $user) echo " " . $user->username
             ?>
            </p>
        </div>

        <div class="btn-group col-md-1 col-sm-1">
            <button data-toggle="dropdown" class="three-dots dropdown-toggle pull-right"><i class="fa fa-ellipsis-h" aria-hidden="true" style="text-size: 15px;"></i></button>
            <ul class="dropdown-menu">
                <li><a id="dialog_properties" href="#">Options</a></li>
            </ul>
        </div>
    </div>
</div> <!--Шапка диалога | Настройки -->

<div class="col-md-8 col-sm-10 col-md-offset-2 col-sm-offset-1">
    <div class="dialog" id="dialog_block">
        <ul class="dialog" id="messages_list">
            <?php if (!empty($messages)): ?>
                <?php foreach ($messages as $message)
                    echo $this->render('/templates/_message', compact('message'));
                ?>
            <?php else: ?>
                <h4 class="text-danger text-center">You have not any messages in this dialog</h4>
            <?php endif; ?>
        </ul>

    </div>

    <div class="typing" id="typing">

    </div>

    <div class="message-input">
        <textarea class="dialog" id="textarea"></textarea>
        <button id="send_message" class="btn" data-dialog_id="<?= $dialog->getId() ?>"
                data-user_id="<?= \Yii::$app->user->getId() ?>">Send
        </button>
    </div>

</div> <!--Блок с сообщениями -->
